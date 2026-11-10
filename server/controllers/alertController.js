import prisma from "../config/db.js";

export const getStudentAlerts = async (req, res) => {
    try {
        const { studentId } = req.query;
        if (!studentId) {
            return res.status(400).json({ success: false, message: "studentId is required." });
        }

        const student = await prisma.student.findFirst({
            where: { rollNo: studentId, email: req.user.email },
            select: { rollNo: true }
        });
        if (!student) {
            return res.status(403).json({ success: false, message: "You can only access your own alerts." });
        }

        const alerts = await prisma.studentAlert.findMany({
            where: { studentId: student.rollNo },
            include: {
                issuedBook: { select: { dueDate: true, book: { select: { title: true } } } }
            },
            orderBy: { createdAt: "desc" }
        });
        return res.status(200).json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch student alerts.", error: error.message });
    }
};

export const markStudentAlertRead = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const alert = await prisma.studentAlert.findFirst({
            where: { id, student: { email: req.user.email } }
        });
        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found." });
        }

        const updatedAlert = await prisma.studentAlert.update({
            where: { id: alert.id },
            data: { readAt: new Date() }
        });
        return res.status(200).json({ success: true, alert: updatedAlert });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update student alert.", error: error.message });
    }
};
