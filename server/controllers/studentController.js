import prisma from "../config/db.js";
import { syncOverdueFines } from "./fineController.js";
import {
    refreshCohortRecommendations,
    refreshStudentRecommendations
} from "../services/recommendationService.js";

export const getStudentRecommendations = async (req, res) => {
    try {
        if (req.auth?.role !== "student" || !req.auth?.email) {
            return res.status(403).json({ success: false, message: "Student access is required." });
        }

        const student = await prisma.student.findUnique({
            where: { email: req.auth.email },
            select: { rollNo: true, department: true, yearOfStudy: true }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found." });
        }

        let personalCache = await prisma.studentRecommendationCache.findUnique({ where: { studentId: student.rollNo } });
        if (!personalCache) {
            await refreshStudentRecommendations(student.rollNo);
            personalCache = await prisma.studentRecommendationCache.findUnique({ where: { studentId: student.rollNo } });
        }

        let cohortCache = await prisma.cohortRecommendationCache.findUnique({
            where: {
                department_yearOfStudy: {
                    department: student.department,
                    yearOfStudy: student.yearOfStudy
                }
            }
        });
        if (!cohortCache) {
            await refreshCohortRecommendations(student.department, student.yearOfStudy);
            cohortCache = await prisma.cohortRecommendationCache.findUnique({
                where: {
                    department_yearOfStudy: {
                        department: student.department,
                        yearOfStudy: student.yearOfStudy
                    }
                }
            });
        }

        return res.status(200).json({
            success: true,
            context: {
                department: student.department,
                yearOfStudy: student.yearOfStudy
            },
            personalRecommendations: personalCache?.personalRecommendations || [],
            peerRecommendations: cohortCache?.peerRecommendations || []
        });
    } catch (error) {
        console.error("Error generating student recommendations:", error);
        return res.status(500).json({ success: false, message: "Failed to generate book recommendations." });
    }
};

export const getStudents = async (req, res) => {
    try {
        await syncOverdueFines();
        const students = await prisma.student.findMany({
            include: {
                user: { select: { username: true, email: true } },
                _count: { select: { issuedBooks: true, fines: true, reservations: true } }
            },
            orderBy: { rollNo: "asc" }
        });
        return res.status(200).json({ success: true, count: students.length, students });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch students.", error: error.message });
    }
};

export const getStudentByRollNo = async (req, res) => {
    try {
        await syncOverdueFines();
        const { rollNo } = req.params;
        const student = await prisma.student.findUnique({
            where: { rollNo },
            include: {
                user: { select: { username: true, email: true } },
                issuedBooks: {
                    where: { isReturned: false },
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                isbn: true,
                                category: { select: { name: true } },
                                department: { select: { name: true } }
                            }
                        }
                    }
                },
                borrowHistories: {
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                isbn: true,
                                category: { select: { name: true } },
                                department: { select: { name: true } }
                            }
                        }
                    }
                },
                reservations: {
                    include: { book: { select: { id: true, title: true } }, status: true }
                },
                fines: {
                    include: { fineType: true, payments: true }
                }
            }
        });
        if (!student) {
            return res.status(404).json({ success: false, message: `Student with Roll No ${rollNo} not found.` });
        }
        return res.status(200).json({ success: true, student });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch student details.", error: error.message });
    }
};

export const updateStudent = async (req, res) => {
    try {
        const { rollNo } = req.params;
        const { department, yearOfStudy, username } = req.body;

        const updatedStudent = await prisma.student.update({
            where: { rollNo },
            data: {
                ...(department && { department }),
                ...(yearOfStudy && { yearOfStudy: parseInt(yearOfStudy, 10) }),
                ...(username && {
                    user: {
                        update: { username }
                    }
                })
            },
            include: { user: { select: { username: true, email: true } } }
        });

        return res.status(200).json({ success: true, message: "Student profile updated.", student: updatedStudent });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update student profile.", error: error.message });
    }
};

export const getStudentIssuedBooks = async (req, res) => {
    try {
        const { rollNo } = req.params;
        const issuedBooks = await prisma.issuedBook.findMany({
            where: { studentId: rollNo, isReturned: false },
            include: { book: true }
        });
        return res.status(200).json({ success: true, count: issuedBooks.length, issuedBooks });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch student issued books.", error: error.message });
    }
};
