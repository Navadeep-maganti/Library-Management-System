import express from "express";
import {
    getAllBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
    updateBookStock,
    updateTotalCopies,
    updateAvailableCopies,
    syncInventory,
    getInventorySummary
} from "../controllers/bookController.js";

const router = express.Router();

// 1. Inventory Summary & Reconciliation Routes (placed before /:id to prevent route conflicts)
router.get("/inventory/summary", getInventorySummary);
router.post("/sync-inventory", syncInventory);

// 2. Standard CRUD Routes
// GET /api/books - Get all books (with search, category/department filter, pagination)
router.get("/", getAllBooks);

// POST /api/books - Create new book with initial physical copies & shelf
router.post("/", createBook);

// Dedicated Stock Endpoints:
// PATCH /api/books/:id/total-copies (and /api/books/:id/stock/total) - Update Total physical copies
router.patch("/:id/total-copies", updateTotalCopies);
router.patch("/:id/stock/total", updateTotalCopies);

// PATCH /api/books/:id/available-copies (and /api/books/:id/stock/available) - Update Available shelf copies
router.patch("/:id/available-copies", updateAvailableCopies);
router.patch("/:id/stock/available", updateAvailableCopies);

// GET /api/books/:id - Get single book details with stock, shelf, active loans, and reservations
router.get("/:id", getBookById);

// PUT /api/books/:id - Update book metadata AND/OR stock (totalCopies, availableCopies, shelfId)
router.put("/:id", updateBook);

// PATCH /api/books/:id/stock - Unified dynamic stock adjustment (+/- delta, total, available, shelf)
router.patch("/:id/stock", updateBookStock);

// DELETE /api/books/:id - Delete book (with unreturned issue & active reservation protections)
router.delete("/:id", deleteBook);

export default router;
