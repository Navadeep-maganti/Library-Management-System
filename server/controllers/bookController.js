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

export const updateBookStock = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) return res.status(400).json({ success: false, message: "Invalid book ID." });

        const availability = await prisma.bookAvailability.findFirst({ where: { bookId } });
        if (!availability) return res.status(404).json({ success: false, message: "Book inventory record not found." });

        const { delta, totalCopies, availableCopies, shelfId } = req.body;
        const parsedDelta = delta === undefined ? 0 : parseInt(delta, 10);
        if (delta !== undefined && isNaN(parsedDelta)) {
            return res.status(400).json({ success: false, message: "delta must be a valid number." });
        }

        const nextTotal = totalCopies === undefined
            ? availability.totalCopies + parsedDelta
            : parseInt(totalCopies, 10);
        const nextAvailable = availableCopies === undefined
            ? availability.availableCopies + parsedDelta
            : parseInt(availableCopies, 10);

        if (isNaN(nextTotal) || isNaN(nextAvailable) || nextTotal < 0 || nextAvailable < 0 || nextAvailable > nextTotal) {
            return res.status(400).json({ success: false, message: "Stock values must be valid and available copies cannot exceed total copies." });
        }

        const updatedAvailability = await prisma.bookAvailability.update({
            where: { id: availability.id },
            data: {
                totalCopies: nextTotal,
                availableCopies: nextAvailable,
                ...(shelfId !== undefined && { shelfId: shelfId ? parseInt(shelfId, 10) : null })
            },
            include: { shelf: true }
        });

        return res.status(200).json({ success: true, message: "Book stock updated successfully.", availability: updatedAvailability });
    } catch (error) {
        console.error("Error updating book stock:", error);
        return res.status(500).json({ success: false, message: "Failed to update book stock.", error: error.message });
    }
};

