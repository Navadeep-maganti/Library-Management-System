import prisma from "../config/db.js";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export const getCalendarDaysSince = (startDate, endDate = new Date()) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    return Math.max(0, Math.floor((endDay - startDay) / MILLISECONDS_PER_DAY));
};

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
                fines: { include: { payments: true } }
            }
        });

        for (const issued of overdueIssuedBooks) {
            const dueDate = new Date(issued.dueDate);
            const diffTime = Math.abs(now - dueDate);
            const totalOverdueDays = Math.max(1, Math.ceil(diffTime / MILLISECONDS_PER_DAY));
            const allFines = issued.fines || [];
            const unpaidFine = allFines.find((fine) => !fine.isPaid);
            const latestPaymentDate = allFines
                .flatMap((fine) => fine.payments || [])
                .map((payment) => new Date(payment.paymentDate))
                .sort((a, b) => b - a)[0];

            if (unpaidFine) {
                const accruedDays = latestPaymentDate
                    ? getCalendarDaysSince(latestPaymentDate, now)
                    : totalOverdueDays;
                const fineAmount = accruedDays * finePerDay;
                const description = latestPaymentDate
                    ? `Overdue book loan by ${accruedDays} day(s) since last payment @ ₹${finePerDay}/day.`
                    : `Overdue book loan by ${totalOverdueDays} day(s) @ ₹${finePerDay}/day.`;

                if (fineAmount > 0 && (Number(unpaidFine.amount) !== fineAmount || unpaidFine.description !== description)) {
                    await prisma.fine.update({
                        where: { id: unpaidFine.id },
                        data: { amount: fineAmount, description }
                    });
                }
            } else if (latestPaymentDate) {
                // A paid fine is historical. Start a new unpaid fine for days accrued after payment.
                const accruedDays = getCalendarDaysSince(latestPaymentDate, now);
                if (accruedDays > 0) {
                    await prisma.fine.create({
                        data: {
                            studentId: issued.studentId,
                            issuedBookId: issued.id,
                            fineTypeId: fineType.id,
                            amount: accruedDays * finePerDay,
                            issueDate: now,
                            isPaid: false,
                            description: `Overdue book loan by ${accruedDays} day(s) since last payment @ ₹${finePerDay}/day.`
                        }
                    });
                }
            } else {
                // Create the initial fine record for this overdue book.
                await prisma.fine.create({
                    data: {
                        studentId: issued.studentId,
                        issuedBookId: issued.id,
                        fineTypeId: fineType.id,
                        amount: totalOverdueDays * finePerDay,
                        issueDate: now,
                        isPaid: false,
                        description: `Overdue book loan by ${totalOverdueDays} day(s) @ ₹${finePerDay}/day.`
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error synchronizing overdue fines:", error);
    }
};
import Razorpay from "razorpay";
import crypto from "crypto";

const getRazorpayInstance = () => {
    const key_id = (process.env.RAZORPAY_KEY_ID || "").trim();
    const key_secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!key_id || !key_secret) {
        throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing in environment variables.");
    }
    return new Razorpay({ key_id, key_secret });
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
                student: { select: { rollNo: true, department: true, user: { select: { username: true, email: true } } } },
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

/**
 * @desc Create a Razorpay Order for a single fine
 * @route POST /api/fines/:id/create-razorpay-order
 */
export const createRazorpayOrder = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: "Valid fine ID is required." });
        }

        const fine = await prisma.fine.findUnique({
            where: { id },
            include: {
                student: { select: { rollNo: true, user: { select: { username: true, email: true } } } },
                issuedBook: { select: { book: { select: { title: true } } } }
            }
        });

        if (!fine) {
            return res.status(404).json({ success: false, message: "Fine record not found." });
        }
        if (fine.isPaid) {
            return res.status(400).json({ success: false, message: "This fine has already been paid." });
        }

        const amountInRupees = Number(fine.amount);
        if (amountInRupees <= 0) {
            return res.status(400).json({ success: false, message: "Fine amount must be greater than zero." });
        }

        const razorpay = getRazorpayInstance();
        const amountInPaise = Math.round(amountInRupees * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_fine_${fine.id}_${Date.now()}`.slice(0, 40),
            notes: {
                fineId: String(fine.id),
                studentId: String(fine.studentId),
                bookTitle: String(fine.issuedBook?.book?.title || "Library Book").slice(0, 50)
            }
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: true,
            order,
            keyId: (process.env.RAZORPAY_KEY_ID || "").trim(),
            fine: {
                id: fine.id,
                amount: amountInRupees,
                studentId: fine.studentId,
                studentName: fine.student?.user?.username || "",
                studentEmail: fine.student?.user?.email || "",
                bookTitle: fine.issuedBook?.book?.title || "Library Book"
            }
        });
    } catch (error) {
        console.error("Error creating Razorpay order for fine:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initialize Razorpay payment order.",
            error: error.message
        });
    }
};

/**
 * @desc Create a combined Razorpay Order to pay all pending fines for a student
 * @route POST /api/fines/create-all-order
 */
export const createAllRazorpayOrder = async (req, res) => {
    try {
        const studentId = req.body.studentId || req.query.studentId;
        if (!studentId) {
            return res.status(400).json({ success: false, message: "Student ID (Roll No) is required." });
        }

        const unpaidFines = await prisma.fine.findMany({
            where: { studentId: String(studentId), isPaid: false },
            include: {
                student: { select: { rollNo: true, user: { select: { username: true, email: true } } } }
            }
        });

        if (!unpaidFines.length) {
            return res.status(400).json({ success: false, message: "No unpaid fines found for this student." });
        }

        const totalRupees = unpaidFines.reduce((sum, f) => sum + Number(f.amount), 0);
        if (totalRupees <= 0) {
            return res.status(400).json({ success: false, message: "Total outstanding fine is zero." });
        }

        const razorpay = getRazorpayInstance();
        const amountInPaise = Math.round(totalRupees * 100);
        const fineIds = unpaidFines.map(f => f.id);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_all_${String(studentId).slice(0, 10)}_${Date.now()}`.slice(0, 40),
            notes: {
                studentId: String(studentId),
                fineIds: fineIds.join(","),
                count: String(fineIds.length)
            }
        };

        const order = await razorpay.orders.create(options);
        const studentUser = unpaidFines[0]?.student?.user;

        return res.status(200).json({
            success: true,
            order,
            keyId: (process.env.RAZORPAY_KEY_ID || "").trim(),
            totalAmount: totalRupees,
            fineIds,
            student: {
                rollNo: studentId,
                name: studentUser?.username || "",
                email: studentUser?.email || ""
            }
        });
    } catch (error) {
        console.error("Error creating combined Razorpay order:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initialize combined Razorpay order.",
            error: error.message
        });
    }
};

/**
 * @desc Verify Razorpay payment signature and mark fine(s) as paid
 * @route POST /api/fines/verify-razorpay-payment
 */
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            fineId,
            fineIds
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Missing Razorpay verification parameters (order_id, payment_id, or signature)."
            });
        }

        const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
        if (!keySecret) {
            return res.status(500).json({
                success: false,
                message: "Server Razorpay secret key is not configured."
            });
        }

        // Verify HMAC SHA-256 signature
        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature. Verification failed."
            });
        }

        // Determine list of fine IDs to settle
        let targetFineIds = [];
        if (Array.isArray(fineIds) && fineIds.length > 0) {
            targetFineIds = fineIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        } else if (fineId) {
            const parsed = parseInt(fineId, 10);
            if (!isNaN(parsed)) targetFineIds.push(parsed);
        }

        if (targetFineIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fine ID(s) provided for payment settlement."
            });
        }

        const finesToUpdate = await prisma.fine.findMany({
            where: { id: { in: targetFineIds } }
        });

        if (!finesToUpdate.length) {
            return res.status(404).json({ success: false, message: "No matching fine records found." });
        }

        // Atomically record payment and mark fines as paid
        const result = await prisma.$transaction(async (tx) => {
            const payments = [];
            for (const f of finesToUpdate) {
                if (!f.isPaid) {
                    const payment = await tx.finePayment.create({
                        data: {
                            fineId: f.id,
                            amountPaid: f.amount,
                            paymentMethod: "RAZORPAY",
                            transactionId: razorpay_payment_id
                        }
                    });
                    payments.push(payment);

                    await tx.fine.update({
                        where: { id: f.id },
                        data: { isPaid: true }
                    });
                }
            }
            return payments;
        });

        return res.status(200).json({
            success: true,
            message: `Successfully paid and settled ${result.length} fine(s).`,
            paymentId: razorpay_payment_id,
            settledCount: result.length
        });

    } catch (error) {
        console.error("Error verifying Razorpay payment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify and record Razorpay payment.",
            error: error.message
        });
    }
};
