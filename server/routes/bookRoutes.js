import express from "express";
import {
    getAllBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook
} from "../controllers/bookController.js";

const router = express.Router();

// GET /api/books - Get all books
router.get("/", getAllBooks);

// POST /api/books - Create new book
router.post("/", createBook);

// GET /api/books/:id - Get single book
router.get("/:id", getBookById);

// PUT /api/books/:id - Update book
router.put("/:id", updateBook);

// DELETE /api/books/:id - Delete book
router.delete("/:id", deleteBook);

export default router;
