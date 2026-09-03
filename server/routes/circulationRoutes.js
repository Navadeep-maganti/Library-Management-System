import express from "express";
import {
    getIssuedBooks,
    issueBook,
    returnBook,
    renewBook
} from "../controllers/circulationController.js";

const router = express.Router();

router.get("/", getIssuedBooks);
router.post("/", issueBook);
router.post("/:id/return", returnBook);
router.post("/:id/renew", renewBook);

export default router;
