import express from "express";
import {
    getStudents,
    getStudentByRollNo,
    updateStudent,
    getStudentIssuedBooks,
    getStudentRecommendations
} from "../controllers/studentController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.get("/", getStudents);
router.get("/recommendations/me", requireAuth, getStudentRecommendations);
router.get("/:rollNo", getStudentByRollNo);
router.put("/:rollNo", updateStudent);
router.get("/:rollNo/issued-books", getStudentIssuedBooks);

export default router;
