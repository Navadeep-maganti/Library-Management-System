import prisma from "../config/db.js";

export const getStudents = async (req, res) => {
    try {
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
        const { rollNo } = req.params;
        const student = await prisma.student.findUnique({
            where: { rollNo },
            include: {
                user: { select: { username: true, email: true } },
                issuedBooks: {
                    include: { book: { select: { id: true, title: true, isbn: true } } }
                },
                borrowHistories: {
                    include: { book: { select: { id: true, title: true } } }
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
