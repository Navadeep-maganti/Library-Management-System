import prisma from "../config/db.js";

export const getReservations = async (req, res) => {
    try {
        const { studentId, bookId, status } = req.query;
        const whereClause = {};

        if (studentId) whereClause.studentId = studentId;
        if (bookId) whereClause.bookId = parseInt(bookId, 10);
        if (status) whereClause.status = { status };

        const reservations = await prisma.bookReservation.findMany({
            where: whereClause,
            include: {
                student: { select: { rollNo: true, user: { select: { username: true } } } },
                book: { select: { id: true, title: true, author: true } },
                status: true
            },
            orderBy: { reservedDate: "desc" }
        });

        return res.status(200).json({ success: true, count: reservations.length, reservations });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch reservations.", error: error.message });
    }
};

export const createReservation = async (req, res) => {
    try {
        const { studentId, bookId } = req.body;
        if (!studentId || !bookId) {
            return res.status(400).json({ success: false, message: "studentId and bookId are required." });
        }

        const parsedBookId = parseInt(bookId, 10);

        // Check if student & book exist
        const student = await prisma.student.findUnique({ where: { rollNo: studentId } });
        if (!student) return res.status(404).json({ success: false, message: "Student not found." });

        const book = await prisma.book.findUnique({ where: { id: parsedBookId } });
        if (!book) return res.status(404).json({ success: false, message: "Book not found." });

        // Fetch or create 'Reserved' status
        let reservedStatus = await prisma.status.findFirst({ where: { status: "Reserved" } });
        if (!reservedStatus) {
            reservedStatus = await prisma.status.create({ data: { status: "Reserved" } });
        }

        // Calculate queue position
        const currentQueueCount = await prisma.bookReservation.count({
            where: { bookId: parsedBookId, statusId: reservedStatus.id }
        });

        const reservation = await prisma.bookReservation.create({
            data: {
                studentId,
                bookId: parsedBookId,
                queuePosition: currentQueueCount + 1,
                statusId: reservedStatus.id
            },
            include: {
                student: { select: { rollNo: true, user: { select: { username: true } } } },
                book: { select: { id: true, title: true } },
                status: true
            }
        });

        return res.status(201).json({ success: true, message: "Book reserved successfully.", reservation });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create reservation.", error: error.message });
    }
};

export const cancelReservation = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        let cancelledStatus = await prisma.status.findFirst({ where: { status: "Cancelled" } });
        if (!cancelledStatus) {
            cancelledStatus = await prisma.status.create({ data: { status: "Cancelled" } });
        }

        const updated = await prisma.bookReservation.update({
            where: { id },
            data: { statusId: cancelledStatus.id }
        });

        return res.status(200).json({ success: true, message: "Reservation cancelled.", reservation: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to cancel reservation.", error: error.message });
    }
};
