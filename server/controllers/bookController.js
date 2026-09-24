import prisma from "../config/db.js";

/**
 * @desc Get all books with optional search, category/department filter, and pagination
 * @route GET /api/books
 */
export const getAllBooks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            categoryId,
            departmentId,
            sortBy = "id",
            order = "asc"
        } = req.query;

        const isFetchAll = limit === "all" || limit === "0";
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = isFetchAll ? undefined : Math.max(1, parseInt(limit, 10) || 10);
        const skip = isFetchAll ? undefined : (pageNum - 1) * limitNum;

        const whereClause = {};

        const trimmedSearch = typeof search === "string" ? search.trim() : "";
        if (trimmedSearch) {
            whereClause.OR = [
                { title: { contains: trimmedSearch, mode: "insensitive" } },
                { author: { contains: trimmedSearch, mode: "insensitive" } },
                { isbn: { contains: trimmedSearch, mode: "insensitive" } }
            ];
        }

        if (categoryId && !isNaN(parseInt(categoryId, 10))) {
            whereClause.categoryId = parseInt(categoryId, 10);
        }

        if (departmentId && !isNaN(parseInt(departmentId, 10))) {
            whereClause.departmentId = parseInt(departmentId, 10);
        }

        const validSortFields = ["id", "title", "author", "publishedYear"];
        const sortField = validSortFields.includes(sortBy) ? sortBy : "id";
        const sortOrder = order && order.toLowerCase() === "desc" ? "desc" : "asc";

        const [totalBooks, books] = await Promise.all([
            prisma.book.count({ where: whereClause }),
            prisma.book.findMany({
                where: whereClause,
                skip: skip,
                take: limitNum,
                orderBy: { [sortField]: sortOrder },
                include: {
                    category: { select: { id: true, name: true } },
                    department: { select: { id: true, name: true } },
                    availabilities: {
                        include: {
                            shelf: { select: { id: true, section: true, rackNumber: true } }
                        }
                    }
                }
            })
        ]);

        const totalPages = isFetchAll ? 1 : Math.ceil(totalBooks / (limitNum || 10));

        return res.status(200).json({
            success: true,
            totalBooks,
            totalPages,
            currentPage: isFetchAll ? 1 : pageNum,
            limit: isFetchAll ? totalBooks : limitNum,
            books
        });

    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch books from database.",
            error: error.message
        });
    }
};

/**
 * @desc Get a single book by ID
 * @route GET /api/books/:id
 */
export const getBookById = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID format."
            });
        }

        const book = await prisma.book.findUnique({
            where: { id: bookId },
            include: {
                category: true,
                department: true,
                availabilities: {
                    include: {
                        shelf: true
                    }
                },
                issuedBooks: {
                    where: { isReturned: false },
                    select: {
                        id: true,
                        studentId: true,
                        issueDate: true,
                        dueDate: true,
                        renewalCount: true,
                        student: {
                            select: {
                                rollNo: true,
                                department: true,
                                user: { select: { username: true, email: true } }
                            }
                        }
                    }
                },
                reservations: {
                    include: {
                        status: true,
                        student: {
                            select: {
                                rollNo: true,
                                department: true,
                                user: { select: { username: true, email: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: `Book with ID ${bookId} not found.`
            });
        }

        return res.status(200).json({
            success: true,
            book
        });

    } catch (error) {
        console.error("Error fetching book details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch book details.",
            error: error.message
        });
    }
};

/**
 * @desc Create a new book
 * @route POST /api/books
 */
export const createBook = async (req, res) => {
    try {
        const { title, author, isbn, categoryId, departmentId, publishedYear, description, totalCopies = 1, shelfId } = req.body;

        if (!title || !author || !isbn) {
            return res.status(400).json({
                success: false,
                message: "Title, author, and ISBN are required."
            });
        }

        const cleanIsbn = isbn.toString().trim();
        const existingBook = await prisma.book.findUnique({ where: { isbn: cleanIsbn } });
        if (existingBook) {
            return res.status(409).json({
                success: false,
                message: `Book with ISBN ${cleanIsbn} already exists.`
            });
        }

        const numCopies = Math.max(0, parseInt(totalCopies, 10) || 1);
        const parsedShelfId = shelfId ? parseInt(shelfId, 10) : null;
        const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;
        const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : null;
        const parsedYear = publishedYear ? parseInt(publishedYear, 10) : null;

        const newBook = await prisma.book.create({
            data: {
                title: title.trim(),
                author: author.trim(),
                isbn: cleanIsbn,
                categoryId: parsedCategoryId && !isNaN(parsedCategoryId) ? parsedCategoryId : null,
                departmentId: parsedDepartmentId && !isNaN(parsedDepartmentId) ? parsedDepartmentId : null,
                publishedYear: parsedYear && !isNaN(parsedYear) ? parsedYear : null,
                description: description ? description.trim() : null,
                availabilities: {
                    create: {
                        totalCopies: numCopies,
                        availableCopies: numCopies,
                        shelfId: parsedShelfId && !isNaN(parsedShelfId) ? parsedShelfId : null
                    }
                }
            },
            include: {
                category: true,
                department: true,
                availabilities: {
                    include: {
                        shelf: true
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Book created successfully.",
            book: newBook
        });

    } catch (error) {
        console.error("Error creating book:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create book.",
            error: error.message
        });
    }
};

/**
 * @desc Update a book by ID (dynamically updates book info, category, department, shelf, and stock copies)
 * @route PUT /api/books/:id
 */
export const updateBook = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) {
            return res.status(400).json({ success: false, message: "Invalid book ID." });
        }

        const existingBook = await prisma.book.findUnique({
            where: { id: bookId },
            include: { availabilities: true }
        });

        if (!existingBook) {
            return res.status(404).json({
                success: false,
                message: `Book with ID ${bookId} not found.`
            });
        }

        const {
            title,
            author,
            isbn,
            categoryId,
            departmentId,
            publishedYear,
            description,
            totalCopies,
            availableCopies,
            shelfId
        } = req.body;

        // Check ISBN uniqueness if changed
        if (isbn && isbn.toString().trim() !== existingBook.isbn) {
            const cleanIsbn = isbn.toString().trim();
            const conflict = await prisma.book.findUnique({ where: { isbn: cleanIsbn } });
            if (conflict && conflict.id !== bookId) {
                return res.status(409).json({
                    success: false,
                    message: `Another book with ISBN ${cleanIsbn} already exists.`
                });
            }
        }

        // Perform book and availability updates inside a transaction
        const updatedBook = await prisma.$transaction(async (tx) => {
            const bookUpdateData = {};
            if (title !== undefined) bookUpdateData.title = title.trim();
            if (author !== undefined) bookUpdateData.author = author.trim();
            if (isbn !== undefined) bookUpdateData.isbn = isbn.toString().trim();
            if (categoryId !== undefined) {
                bookUpdateData.categoryId = categoryId ? parseInt(categoryId, 10) : null;
            }
            if (departmentId !== undefined) {
                bookUpdateData.departmentId = departmentId ? parseInt(departmentId, 10) : null;
            }
            if (publishedYear !== undefined) {
                bookUpdateData.publishedYear = publishedYear ? parseInt(publishedYear, 10) : null;
            }
            if (description !== undefined) {
                bookUpdateData.description = description ? description.trim() : null;
            }

            // Update main book record
            await tx.book.update({
                where: { id: bookId },
                data: bookUpdateData
            });

            // Handle availability / stock / shelf updates
            const hasAvailabilityUpdate = totalCopies !== undefined || availableCopies !== undefined || shelfId !== undefined;
            if (hasAvailabilityUpdate) {
                const existingAvailability = existingBook.availabilities?.[0];

                if (existingAvailability) {
                    const availUpdateData = {};
                    if (totalCopies !== undefined) {
                        availUpdateData.totalCopies = Math.max(0, parseInt(totalCopies, 10) || 0);
                    }
                    if (availableCopies !== undefined) {
                        availUpdateData.availableCopies = Math.max(0, parseInt(availableCopies, 10) || 0);
                    }
                    if (shelfId !== undefined) {
                        availUpdateData.shelfId = shelfId ? parseInt(shelfId, 10) : null;
                    }

                    await tx.bookAvailability.update({
                        where: { id: existingAvailability.id },
                        data: availUpdateData
                    });
                } else {
                    const numTotal = totalCopies !== undefined ? Math.max(0, parseInt(totalCopies, 10) || 0) : 1;
                    const numAvail = availableCopies !== undefined ? Math.max(0, parseInt(availableCopies, 10) || 0) : numTotal;
                    const parsedShelf = shelfId ? parseInt(shelfId, 10) : null;

                    await tx.bookAvailability.create({
                        data: {
                            bookId,
                            totalCopies: numTotal,
                            availableCopies: numAvail,
                            shelfId: parsedShelf && !isNaN(parsedShelf) ? parsedShelf : null
                        }
                    });
                }
            }

            return await tx.book.findUnique({
                where: { id: bookId },
                include: {
                    category: true,
                    department: true,
                    availabilities: {
                        include: {
                            shelf: true
                        }
                    }
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Book updated successfully.",
            book: updatedBook
        });

    } catch (error) {
        console.error("Error updating book:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update book.",
            error: error.message
        });
    }
};

/**
 * @desc Delete a book by ID
 * @route DELETE /api/books/:id
 */
export const deleteBook = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) {
            return res.status(400).json({ success: false, message: "Invalid book ID." });
        }

        const existingBook = await prisma.book.findUnique({
            where: { id: bookId },
            include: {
                issuedBooks: {
                    where: { isReturned: false }
                },
                reservations: {
                    where: { status: { status: "Reserved" } }
                }
            }
        });

        if (!existingBook) {
            return res.status(404).json({
                success: false,
                message: `Book with ID ${bookId} not found.`
            });
        }

        if (existingBook.issuedBooks && existingBook.issuedBooks.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete book. There are currently ${existingBook.issuedBooks.length} unreturned active issue(s) for this book.`
            });
        }

        if (existingBook.reservations && existingBook.reservations.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete book. There are currently ${existingBook.reservations.length} active reservation(s) for this book.`
            });
        }

        await prisma.book.delete({ where: { id: bookId } });

        return res.status(200).json({
            success: true,
            message: `Book "${existingBook.title}" (ID: ${bookId}) deleted successfully.`
        });

    } catch (error) {
        console.error("Error deleting book:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete book.",
            error: error.message
        });
    }
};

export const getInventorySummary = async (req, res) => {
    try {
        const books = await prisma.book.findMany({
            include: {
                category: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
                availabilities: { select: { totalCopies: true, availableCopies: true } }
            },
            orderBy: { title: "asc" }
        });

        const summary = books.reduce((totals, book) => {
            const totalCopies = book.availabilities.reduce((sum, item) => sum + item.totalCopies, 0);
            const availableCopies = book.availabilities.reduce((sum, item) => sum + item.availableCopies, 0);
            totals.totalCopies += totalCopies;
            totals.availableCopies += availableCopies;
            totals.issuedCopies += Math.max(0, totalCopies - availableCopies);
            return totals;
        }, { titleCount: books.length, totalCopies: 0, availableCopies: 0, issuedCopies: 0 });

        return res.status(200).json({ success: true, summary, books });
    } catch (error) {
        console.error("Error fetching inventory summary:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch inventory summary.", error: error.message });
    }
};

export const syncInventory = async (req, res) => {
    try {
        const availabilities = await prisma.bookAvailability.findMany({
            select: { id: true, totalCopies: true, availableCopies: true }
        });
        let adjustedCount = 0;

        for (const availability of availabilities) {
            const availableCopies = Math.min(
                Math.max(0, availability.availableCopies),
                Math.max(0, availability.totalCopies),
            );
            if (availableCopies !== availability.availableCopies) {
                await prisma.bookAvailability.update({
                    where: { id: availability.id },
                    data: { availableCopies },
                });
                adjustedCount += 1;
            }
        }

        return res.status(200).json({
            success: true,
            message: "Inventory synchronized successfully.",
            adjustedCount,
        });
    } catch (error) {
        console.error("Error synchronizing inventory:", error);
        return res.status(500).json({ success: false, message: "Failed to synchronize inventory.", error: error.message });
    }
};

/**
 * @desc Update total copies of a book (handles acquisition/restocking or decommissioning)
 * @route PATCH /api/books/:id/total-copies OR PATCH /api/books/:id/stock/total
 * @payload { totalCopies?: number, delta?: number, adjustAvailable?: boolean }
 */
export const updateTotalCopies = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) {
            return res.status(400).json({ success: false, message: "Invalid book ID format." });
        }

        const { totalCopies, delta, adjustAvailable = true } = req.body;

        if (totalCopies === undefined && delta === undefined) {
            return res.status(400).json({
                success: false,
                message: "Either 'totalCopies' (absolute count) or 'delta' (relative count adjustment) is required."
            });
        }

        if (totalCopies !== undefined && (isNaN(parseInt(totalCopies, 10)) || parseInt(totalCopies, 10) < 0)) {
            return res.status(400).json({
                success: false,
                message: "'totalCopies' must be a non-negative integer (0 or greater)."
            });
        }

        if (delta !== undefined && isNaN(parseInt(delta, 10))) {
            return res.status(400).json({
                success: false,
                message: "'delta' must be a valid integer."
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const book = await tx.book.findUnique({
                where: { id: bookId },
                include: {
                    availabilities: { include: { shelf: true } },
                    issuedBooks: { where: { isReturned: false } }
                }
            });

            if (!book) {
                const error = new Error(`Book with ID ${bookId} not found.`);
                error.statusCode = 404;
                throw error;
            }

            const activeIssuedCount = book.issuedBooks ? book.issuedBooks.length : 0;
            const existingAvailability = book.availabilities?.[0];

            const currentTotal = existingAvailability ? existingAvailability.totalCopies : 0;
            const currentAvailable = existingAvailability ? existingAvailability.availableCopies : 0;

            let newTotalCopies;
            if (totalCopies !== undefined) {
                newTotalCopies = parseInt(totalCopies, 10);
            } else {
                newTotalCopies = currentTotal + parseInt(delta, 10);
            }

            // Edge Case 1: Total copies cannot be negative
            if (newTotalCopies < 0) {
                const error = new Error(`Total copies cannot be negative (calculated: ${newTotalCopies}).`);
                error.statusCode = 400;
                throw error;
            }

            // Edge Case 2: Cannot reduce total copies below active loans currently held by students
            if (newTotalCopies < activeIssuedCount) {
                const error = new Error(
                    `Cannot reduce total copies to ${newTotalCopies}. There are currently ${activeIssuedCount} active book loan(s) issued to students.`
                );
                error.statusCode = 400;
                throw error;
            }

            // Edge Case 3: Calculate new available copies within boundaries
            const maxPossibleAvailable = newTotalCopies - activeIssuedCount;
            let newAvailableCopies;
            if (totalCopies !== undefined) {
                const totalDelta = newTotalCopies - currentTotal;
                if (adjustAvailable) {
                    newAvailableCopies = Math.max(0, Math.min(currentAvailable + totalDelta, maxPossibleAvailable));
                } else {
                    newAvailableCopies = Math.max(0, Math.min(currentAvailable, maxPossibleAvailable));
                }
            } else {
                const parsedDelta = parseInt(delta, 10);
                if (adjustAvailable) {
                    newAvailableCopies = Math.max(0, Math.min(currentAvailable + parsedDelta, maxPossibleAvailable));
                } else {
                    newAvailableCopies = Math.max(0, Math.min(currentAvailable, maxPossibleAvailable));
                }
            }

            let updatedAvailability;
            if (existingAvailability) {
                updatedAvailability = await tx.bookAvailability.update({
                    where: { id: existingAvailability.id },
                    data: {
                        totalCopies: newTotalCopies,
                        availableCopies: newAvailableCopies
                    },
                    include: { shelf: true }
                });
            } else {
                updatedAvailability = await tx.bookAvailability.create({
                    data: {
                        bookId,
                        totalCopies: newTotalCopies,
                        availableCopies: newAvailableCopies
                    },
                    include: { shelf: true }
                });
            }

            return {
                bookId: book.id,
                bookTitle: book.title,
                activeIssuedCount,
                previousTotal: currentTotal,
                previousAvailable: currentAvailable,
                availability: updatedAvailability
            };
        });

        return res.status(200).json({
            success: true,
            message: `Total copies for "${result.bookTitle}" updated successfully from ${result.previousTotal} to ${result.availability.totalCopies}.`,
            data: result
        });

    } catch (error) {
        console.error("Error in updateTotalCopies:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update total copies.",
            error: error.message
        });
    }
};

/**
 * @desc Update available shelf copies of a book (handles shelf reconciliation, damaged copy isolation, manual audits)
 * @route PATCH /api/books/:id/available-copies OR PATCH /api/books/:id/stock/available
 * @payload { availableCopies?: number, delta?: number }
 */
export const updateAvailableCopies = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) {
            return res.status(400).json({ success: false, message: "Invalid book ID format." });
        }

        const { availableCopies, delta } = req.body;

        if (availableCopies === undefined && delta === undefined) {
            return res.status(400).json({
                success: false,
                message: "Either 'availableCopies' (absolute count) or 'delta' (relative count adjustment) is required."
            });
        }

        if (availableCopies !== undefined && (isNaN(parseInt(availableCopies, 10)) || parseInt(availableCopies, 10) < 0)) {
            return res.status(400).json({
                success: false,
                message: "'availableCopies' must be a non-negative integer (0 or greater)."
            });
        }

        if (delta !== undefined && isNaN(parseInt(delta, 10))) {
            return res.status(400).json({
                success: false,
                message: "'delta' must be a valid integer."
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const book = await tx.book.findUnique({
                where: { id: bookId },
                include: {
                    availabilities: { include: { shelf: true } },
                    issuedBooks: { where: { isReturned: false } }
                }
            });

            if (!book) {
                const error = new Error(`Book with ID ${bookId} not found.`);
                error.statusCode = 404;
                throw error;
            }

            const activeIssuedCount = book.issuedBooks ? book.issuedBooks.length : 0;
            const existingAvailability = book.availabilities?.[0];

            const currentTotal = existingAvailability ? existingAvailability.totalCopies : 0;
            const currentAvailable = existingAvailability ? existingAvailability.availableCopies : 0;

            let newAvailableCopies;
            if (availableCopies !== undefined) {
                newAvailableCopies = parseInt(availableCopies, 10);
            } else {
                newAvailableCopies = currentAvailable + parseInt(delta, 10);
            }

            // Edge Case 1: Available copies cannot be negative
            if (newAvailableCopies < 0) {
                const error = new Error(`Available copies cannot be negative (calculated: ${newAvailableCopies}).`);
                error.statusCode = 400;
                throw error;
            }

            // Edge Case 2: Available copies cannot exceed total stock
            if (newAvailableCopies > currentTotal) {
                const error = new Error(
                    `Available copies (${newAvailableCopies}) cannot exceed total stock (${currentTotal} copies).`
                );
                error.statusCode = 400;
                throw error;
            }

            // Edge Case 3: Available copies cannot exceed total stock minus active loans
            const maxShelfCapacity = Math.max(0, currentTotal - activeIssuedCount);
            if (newAvailableCopies > maxShelfCapacity) {
                const error = new Error(
                    `Available copies (${newAvailableCopies}) exceeds maximum physical shelf capacity of ${maxShelfCapacity} (${activeIssuedCount} active loan(s) currently out of ${currentTotal} total stock).`
                );
                error.statusCode = 400;
                throw error;
            }

            let updatedAvailability;
            if (existingAvailability) {
                updatedAvailability = await tx.bookAvailability.update({
                    where: { id: existingAvailability.id },
                    data: {
                        availableCopies: newAvailableCopies
                    },
                    include: { shelf: true }
                });
            } else {
                updatedAvailability = await tx.bookAvailability.create({
                    data: {
                        bookId,
                        totalCopies: newAvailableCopies,
                        availableCopies: newAvailableCopies
                    },
                    include: { shelf: true }
                });
            }

            return {
                bookId: book.id,
                bookTitle: book.title,
                totalStock: currentTotal,
                activeIssuedCount,
                previousAvailable: currentAvailable,
                availability: updatedAvailability
            };
        });

        return res.status(200).json({
            success: true,
            message: `Available shelf copies for "${result.bookTitle}" updated successfully from ${result.previousAvailable} to ${result.availability.availableCopies}.`,
            data: result
        });

    } catch (error) {
        console.error("Error in updateAvailableCopies:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update available copies.",
            error: error.message
        });
    }
};

/**
 * @desc Unified book stock update endpoint (supports total, available, delta, and shelfId)
 * @route PATCH /api/books/:id/stock
 */
export const updateBookStock = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) return res.status(400).json({ success: false, message: "Invalid book ID format." });

        const { delta, totalCopies, availableCopies, shelfId } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const book = await tx.book.findUnique({
                where: { id: bookId },
                include: {
                    availabilities: { include: { shelf: true } },
                    issuedBooks: { where: { isReturned: false } }
                }
            });

            if (!book) {
                const error = new Error(`Book with ID ${bookId} not found.`);
                error.statusCode = 404;
                throw error;
            }

            const activeIssuedCount = book.issuedBooks ? book.issuedBooks.length : 0;
            const existingAvailability = book.availabilities?.[0];

            const currentTotal = existingAvailability ? existingAvailability.totalCopies : 0;
            const currentAvailable = existingAvailability ? existingAvailability.availableCopies : 0;

            const parsedDelta = delta === undefined ? 0 : parseInt(delta, 10);
            if (delta !== undefined && isNaN(parsedDelta)) {
                const error = new Error("'delta' must be a valid number.");
                error.statusCode = 400;
                throw error;
            }

            let nextTotal = totalCopies === undefined
                ? currentTotal + parsedDelta
                : parseInt(totalCopies, 10);

            let nextAvailable = availableCopies === undefined
                ? currentAvailable + parsedDelta
                : parseInt(availableCopies, 10);

            if (isNaN(nextTotal) || nextTotal < 0) {
                const error = new Error("Total copies must be a non-negative number.");
                error.statusCode = 400;
                throw error;
            }

            if (isNaN(nextAvailable) || nextAvailable < 0) {
                const error = new Error("Available copies must be a non-negative number.");
                error.statusCode = 400;
                throw error;
            }

            if (nextTotal < activeIssuedCount) {
                const error = new Error(
                    `Cannot reduce total copies below active loans (${activeIssuedCount} copies currently issued).`
                );
                error.statusCode = 400;
                throw error;
            }

            const maxAvailable = nextTotal - activeIssuedCount;
            if (nextAvailable > maxAvailable) {
                const error = new Error(
                    `Available copies (${nextAvailable}) cannot exceed available shelf capacity of ${maxAvailable} (${activeIssuedCount} currently issued out of ${nextTotal} total stock).`
                );
                error.statusCode = 400;
                throw error;
            }

            let updatedAvailability;
            if (existingAvailability) {
                updatedAvailability = await tx.bookAvailability.update({
                    where: { id: existingAvailability.id },
                    data: {
                        totalCopies: nextTotal,
                        availableCopies: nextAvailable,
                        ...(shelfId !== undefined && { shelfId: shelfId ? parseInt(shelfId, 10) : null })
                    },
                    include: { shelf: true }
                });
            } else {
                updatedAvailability = await tx.bookAvailability.create({
                    data: {
                        bookId,
                        totalCopies: nextTotal,
                        availableCopies: nextAvailable,
                        shelfId: shelfId ? parseInt(shelfId, 10) : null
                    },
                    include: { shelf: true }
                });
            }

            return updatedAvailability;
        });

        return res.status(200).json({
            success: true,
            message: "Book stock updated successfully.",
            availability: result
        });
    } catch (error) {
        console.error("Error updating book stock:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update book stock.",
            error: error.message
        });
    }
};

