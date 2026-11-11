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

        const [dueDateAlerts, availabilityAlerts] = await Promise.all([
            prisma.studentAlert.findMany({
            where: { studentId: student.rollNo },
            include: {
                issuedBook: { select: { dueDate: true, book: { select: { title: true } } } }
            },
            orderBy: { createdAt: "desc" }
            }),
            prisma.bookAvailabilityAlert.findMany({
                where: { studentId: student.rollNo },
                include: { book: { select: { title: true } } },
                orderBy: { createdAt: "desc" }
            })
        ]);
        const alerts = [
            ...dueDateAlerts,
            ...availabilityAlerts.map((alert) => ({
                ...alert,
                type: "availability",
                issuedBook: null
            }))
        ].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
        return res.status(200).json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch student alerts.", error: error.message });
    }
};

export const markStudentAlertRead = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const isAvailabilityAlert = req.query.type === "availability";
        const [alert, availabilityAlert] = await Promise.all([
            isAvailabilityAlert ? null : prisma.studentAlert.findFirst({ where: { id, student: { email: req.user.email } } }),
            isAvailabilityAlert ? prisma.bookAvailabilityAlert.findFirst({ where: { id, student: { email: req.user.email } } }) : null
        ]);
        if (!alert && !availabilityAlert) return res.status(404).json({ success: false, message: "Alert not found." });

        const updatedAlert = alert
            ? await prisma.studentAlert.update({ where: { id: alert.id }, data: { readAt: new Date() } })
            : await prisma.bookAvailabilityAlert.update({ where: { id: availabilityAlert.id }, data: { readAt: new Date() } });
        return res.status(200).json({ success: true, alert: updatedAlert });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update student alert.", error: error.message });
    }
};
