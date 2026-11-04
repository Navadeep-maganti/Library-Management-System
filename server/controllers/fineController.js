import prisma from "../config/db.js";

/**
 * Synchronizes overdue issued books with the Fine registry.
 * Automatically computes daily penalties for unreturned books past their dueDate.
 */
export const syncOverdueFines = async () => {
    try {
        const now = new Date();

        // 1. Fetch library constants for daily fine rate
        const constants = await prisma.libraryConstants.findFirst() || { overdueFinePerDay: 5.00 };
        const finePerDay = Number(constants.overdueFinePerDay) || 5.00;

        // 2. Fetch or create the "Overdue Return" fine type
        let fineType = await prisma.fineType.findFirst({ where: { type: "Overdue Return" } });
        if (!fineType) {
            fineType = await prisma.fineType.create({ data: { type: "Overdue Return" } });
        }

        // 3. Find all active issued books that have passed their dueDate
        const overdueIssuedBooks = await prisma.issuedBook.findMany({
            where: {
                isReturned: false,
                dueDate: { lt: now }
            },
            include: {
                student: true,
                book: true,
                fines: true
            }
        });

        for (const issued of overdueIssuedBooks) {
            const dueDate = new Date(issued.dueDate);
            const diffTime = Math.abs(now - dueDate);
            const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            const fineAmount = diffDays * finePerDay;
            const description = `Overdue book loan by ${diffDays} day(s) @ ₹${finePerDay}/day.`;

            // Check if a fine already exists for this issued book
            const existingFine = (issued.fines && issued.fines.length > 0)
                ? issued.fines[0]
                : await prisma.fine.findFirst({ where: { issuedBookId: issued.id } });

            if (!existingFine) {
                // Create a new fine record for this overdue book
                await prisma.fine.create({
                    data: {
                        studentId: issued.studentId,
                        issuedBookId: issued.id,
                        fineTypeId: fineType.id,
                        amount: fineAmount,
                        issueDate: now,
                        isPaid: false,
                        description
                    }
                });
            } else if (!existingFine.isPaid) {
                // If unpaid, keep amount and description up to date with the latest accrued overdue days
                const currentAmount = Number(existingFine.amount);
                if (currentAmount !== fineAmount || existingFine.description !== description) {
                    await prisma.fine.update({
                        where: { id: existingFine.id },
                        data: {
                            amount: fineAmount,
                            description
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error synchronizing overdue fines:", error);
    }
};

export const getFines = async (req, res) => {
    try {
        // Automatically sync overdue books into fines first so records are completely up-to-date
        await syncOverdueFines();

        const { studentId, isPaid } = req.query;
        const whereClause = {};

        if (studentId) whereClause.studentId = studentId;
        if (isPaid !== undefined) whereClause.isPaid = isPaid === "true";

        const fines = await prisma.fine.findMany({
            where: whereClause,
            include: {
                student: { select: { rollNo: true, department: true, user: { select: { username: true, email: true } } } },
                issuedBook: {
                    select: {
                        id: true,
                        dueDate: true,
                        returnDate: true,
                        isReturned: true,
                        book: { select: { id: true, title: true, author: true, isbn: true } }
                    }
                },
                fineType: true,
                payments: {
                    orderBy: { paymentDate: "desc" }
                }
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
                student: { include: { user: { select: { username: true, email: true } } } },
                issuedBook: { include: { book: true } },
                fineType: true,
                payments: {
                    orderBy: { paymentDate: "desc" }
                }
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

export const syncFinesEndpoint = async (req, res) => {
    try {
        await syncOverdueFines();
        return res.status(200).json({ success: true, message: "Overdue fines synchronized successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to sync overdue fines.", error: error.message });
    }
};
