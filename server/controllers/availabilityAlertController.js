import prisma from "../config/db.js";

const getStudent = async (email) =>
    prisma.student.findUnique({
        where: { email },
        select: { rollNo: true }
    });

export const subscribeToBookAvailability = async (req, res) => {
    try {
        const bookId = parseInt(req.params.bookId, 10);
        if (Number.isNaN(bookId)) return res.status(400).json({ success: false, message: "Invalid book ID." });

        const student = await getStudent(req.user.email);
        if (!student || req.user.role !== "student") {
            return res.status(403).json({ success: false, message: "Student access is required." });
        }

        const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { id: true, title: true, availabilities: { select: { availableCopies: true } } }
        });
        if (!book) return res.status(404).json({ success: false, message: "Book not found." });

        const availableCopies = book.availabilities.reduce((total, item) => total + item.availableCopies, 0);
        if (availableCopies > 0) {
            return res.status(409).json({ success: false, message: "This book is already available to reserve." });
        }

        const subscription = await prisma.bookAvailabilitySubscription.upsert({
            where: { studentId_bookId: { studentId: student.rollNo, bookId } },
            create: { studentId: student.rollNo, bookId },
            update: {}
        });
        return res.status(201).json({ success: true, subscribed: true, subscription });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Could not enable availability alerts." });
    }
};

export const unsubscribeFromBookAvailability = async (req, res) => {
    try {
        const bookId = parseInt(req.params.bookId, 10);
        const student = await getStudent(req.user.email);
        if (!student || req.user.role !== "student") {
            return res.status(403).json({ success: false, message: "Student access is required." });
        }
        await prisma.bookAvailabilitySubscription.deleteMany({ where: { studentId: student.rollNo, bookId } });
        return res.status(200).json({ success: true, subscribed: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Could not disable availability alerts." });
    }
};

export const getBookAvailabilitySubscription = async (req, res) => {
    try {
        const bookId = parseInt(req.params.bookId, 10);
        const student = await getStudent(req.user.email);
        if (!student || req.user.role !== "student") {
            return res.status(403).json({ success: false, message: "Student access is required." });
        }
        const subscription = await prisma.bookAvailabilitySubscription.findUnique({
            where: { studentId_bookId: { studentId: student.rollNo, bookId } },
            select: { id: true }
        });
        return res.status(200).json({ success: true, subscribed: Boolean(subscription) });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Could not load availability alert status." });
    }
};
