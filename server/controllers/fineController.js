import prisma from "../config/db.js";

export const getFines = async (req, res) => {
    try {
        const { studentId, isPaid } = req.query;
        const whereClause = {};

        if (studentId) whereClause.studentId = studentId;
        if (isPaid !== undefined) whereClause.isPaid = isPaid === "true";

        const fines = await prisma.fine.findMany({
            where: whereClause,
            include: {
                student: { select: { rollNo: true, user: { select: { username: true } } } },
                issuedBook: { select: { id: true, book: { select: { title: true } } } },
                fineType: true,
                payments: true
            },
            orderBy: { issueDate: "desc" }
        });

        return res.status(200).json({ success: true, count: fines.length, fines });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch fines.", error: error.message });
    }
};

export const getFineById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const fine = await prisma.fine.findUnique({
            where: { id },
            include: {
                student: true,
                issuedBook: { include: { book: true } },
                fineType: true,
                payments: true
            }
        });
        if (!fine) return res.status(404).json({ success: false, message: "Fine not found." });

        return res.status(200).json({ success: true, fine });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch fine.", error: error.message });
    }
};

export const payFine = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { amountPaid, paymentMethod = "CASH", transactionId } = req.body;

        const fine = await prisma.fine.findUnique({ where: { id } });
        if (!fine) return res.status(404).json({ success: false, message: "Fine record not found." });
        if (fine.isPaid) return res.status(400).json({ success: false, message: "Fine is already paid." });

        const payAmount = amountPaid ? Number(amountPaid) : Number(fine.amount);

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.finePayment.create({
                data: {
                    fineId: id,
                    amountPaid: payAmount,
                    paymentMethod,
                    transactionId
                }
            });

            const updatedFine = await tx.fine.update({
                where: { id },
                data: { isPaid: true }
            });

            return { payment, updatedFine };
        });

        return res.status(200).json({
            success: true,
            message: "Fine paid successfully.",
            payment: result.payment,
            fine: result.updatedFine
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to process fine payment.", error: error.message });
    }
};
