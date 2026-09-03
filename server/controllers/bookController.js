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
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = isFetchAll ? undefined : (parseInt(limit, 10) || 10);
        const skip = isFetchAll ? undefined : (pageNum - 1) * limitNum;

        const whereClause = {};

        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { author: { contains: search, mode: "insensitive" } },
                { isbn: { contains: search, mode: "insensitive" } }
            ];
        }

        if (categoryId) {
            whereClause.categoryId = parseInt(categoryId, 10);
        }

        if (departmentId) {
            whereClause.departmentId = parseInt(departmentId, 10);
        }

        const validSortFields = ["id", "title", "author", "publishedYear"];
        const sortField = validSortFields.includes(sortBy) ? sortBy : "id";
        const sortOrder = order.toLowerCase() === "desc" ? "desc" : "asc";

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
            currentPage: pageNum,
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
                reservations: {
                    include: { status: true }
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

        const existingBook = await prisma.book.findUnique({ where: { isbn } });
        if (existingBook) {
            return res.status(409).json({
                success: false,
                message: `Book with ISBN ${isbn} already exists.`
            });
        }

        const numCopies = parseInt(totalCopies, 10) || 1;

        const newBook = await prisma.book.create({
            data: {
                title,
                author,
                isbn,
                categoryId: categoryId ? parseInt(categoryId, 10) : null,
                departmentId: departmentId ? parseInt(departmentId, 10) : null,
                publishedYear: publishedYear ? parseInt(publishedYear, 10) : null,
                description,
                availabilities: {
                    create: {
                        totalCopies: numCopies,
                        availableCopies: numCopies,
                        shelfId: shelfId ? parseInt(shelfId, 10) : null
                    }
                }
            },
            include: {
                category: true,
                department: true,
                availabilities: true
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
 * @desc Update a book by ID
 * @route PUT /api/books/:id
 */
export const updateBook = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id, 10);
        if (isNaN(bookId)) {
            return res.status(400).json({ success: false, message: "Invalid book ID." });
        }

        const { title, author, isbn, categoryId, departmentId, publishedYear, description } = req.body;

        const updatedBook = await prisma.book.update({
            where: { id: bookId },
            data: {
                ...(title && { title }),
                ...(author && { author }),
                ...(isbn && { isbn }),
                ...(categoryId !== undefined && { categoryId: categoryId ? parseInt(categoryId, 10) : null }),
                ...(departmentId !== undefined && { departmentId: departmentId ? parseInt(departmentId, 10) : null }),
                ...(publishedYear !== undefined && { publishedYear: publishedYear ? parseInt(publishedYear, 10) : null }),
                ...(description !== undefined && { description })
            },
            include: {
                category: true,
                department: true,
                availabilities: true
            }
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

        await prisma.book.delete({ where: { id: bookId } });

        return res.status(200).json({
            success: true,
            message: `Book ID ${bookId} deleted successfully.`
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
