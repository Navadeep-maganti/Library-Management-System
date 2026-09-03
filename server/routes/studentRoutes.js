import express from "express";
import {
    getStudents,
    getStudentByRollNo,
    updateStudent,
    getStudentIssuedBooks
} from "../controllers/studentController.js";

const router = express.Router();

router.get("/", getStudents);
router.get("/:rollNo", getStudentByRollNo);
router.put("/:rollNo", updateStudent);
router.get("/:rollNo/issued-books", getStudentIssuedBooks);

export default router;
