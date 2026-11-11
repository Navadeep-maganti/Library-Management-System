import prisma from "../config/db.js";
import { syncOverdueFines } from "./fineController.js";

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

        const [peerHistory, personalHistory, currentIssues, availableBooks] = await Promise.all([
            prisma.borrowHistory.findMany({
                where: {
                    student: {
                        department: student.department,
                        yearOfStudy: student.yearOfStudy
                    },
                    bookId: { not: null }
                },
                select: {
                    bookId: true,
                    studentId: true,
                    book: {
                        select: {
                            id: true,
                            title: true,
                            author: true,
                            category: { select: { name: true } },
                            availabilities: { select: { availableCopies: true } }
                        }
                    }
                }
            }),
            prisma.borrowHistory.findMany({
                where: { studentId: student.rollNo, bookId: { not: null } },
                select: { bookId: true }
            }),
            prisma.issuedBook.findMany({
                where: { studentId: student.rollNo, isReturned: false },
                select: { bookId: true }
            }),
            prisma.book.findMany({
                where: {
                    availabilities: { some: { availableCopies: { gt: 0 } } }
                },
                select: {
                    id: true,
                    title: true,
                    author: true,
                    category: { select: { name: true } },
                    availabilities: { select: { availableCopies: true } }
                }
            })
        ]);

        const personalCounts = new Map();
        const personalCategoryCounts = new Map();
        const personalAuthorCounts = new Map();
        personalHistory.forEach(({ bookId }) => {
            personalCounts.set(bookId, (personalCounts.get(bookId) || 0) + 1);
        });

        const currentBookIds = new Set(currentIssues.map(({ bookId }) => bookId).filter(Boolean));
        const personalBookIds = new Set(personalHistory.map(({ bookId }) => bookId).filter(Boolean));
        const personalBookDetails = await prisma.book.findMany({
            where: { id: { in: Array.from(personalBookIds) } },
            select: { id: true, author: true, category: { select: { name: true } } }
        });
        personalBookDetails.forEach((book) => {
            if (book.category?.name) {
                personalCategoryCounts.set(
                    book.category.name,
                    (personalCategoryCounts.get(book.category.name) || 0) + (personalCounts.get(book.id) || 1)
                );
            }
            personalAuthorCounts.set(
                book.author,
                (personalAuthorCounts.get(book.author) || 0) + (personalCounts.get(book.id) || 1)
            );
        });

        const candidates = new Map();

        peerHistory.forEach((entry) => {
            if (!entry.book || currentBookIds.has(entry.book.id)) return;

            const existing = candidates.get(entry.book.id) || {
                ...entry.book,
                peerIssueCount: 0,
                peerStudentCount: new Set(),
                personalIssueCount: personalCounts.get(entry.book.id) || 0
            };
            existing.peerIssueCount += 1;
            existing.peerStudentCount.add(entry.studentId);
            candidates.set(entry.book.id, existing);
        });

        const peerRecommendations = Array.from(candidates.values())
            .filter((book) => book.availabilities.some((availability) => availability.availableCopies > 0))
            .map(({ availabilities, peerStudentCount, ...book }) => ({
                ...book,
                availableCopies: availabilities.reduce((total, item) => total + item.availableCopies, 0),
                peerStudentCount: peerStudentCount.size,
                score: (book.personalIssueCount * 5) + book.peerIssueCount
            }))
            .sort((first, second) =>
                second.score - first.score ||
                second.peerStudentCount - first.peerStudentCount ||
                first.title.localeCompare(second.title)
            )
            .slice(0, 6);

        const personalRecommendations = availableBooks
            .filter((book) => !currentBookIds.has(book.id) && !personalBookIds.has(book.id))
            .map((book) => {
                const categoryScore = personalCategoryCounts.get(book.category?.name) || 0;
                const authorScore = personalAuthorCounts.get(book.author) || 0;
                return {
                    ...book,
                    availableCopies: book.availabilities.reduce((total, item) => total + item.availableCopies, 0),
                    matchReason: authorScore > 0 ? `Matches author ${book.author}` : `Matches your ${book.category?.name || "library"} interests`,
                    score: (categoryScore * 2) + (authorScore * 3)
                };
            })
            .filter((book) => book.score > 0)
            .sort((first, second) => second.score - first.score || first.title.localeCompare(second.title))
            .slice(0, 6);

        return res.status(200).json({
            success: true,
            context: {
                department: student.department,
                yearOfStudy: student.yearOfStudy
            },
            personalRecommendations,
            peerRecommendations
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
