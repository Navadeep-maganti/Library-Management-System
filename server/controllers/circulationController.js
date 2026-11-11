import prisma from "../config/db.js";
import { notifyBookAvailability } from "../services/availabilityAlertService.js";
import { getCalendarDaysSince, syncOverdueFines } from "./fineController.js";
import { refreshStudentRecommendations } from "../services/recommendationService.js";

/**
 * @desc Get all issued books (active or returned)
 * @route GET /api/issued-books
 */
export const getIssuedBooks = async (req, res) => {
    try {
        // Synchronize any overdue loans so fine records and states remain consistent
        await syncOverdueFines();

        const { isReturned, studentId } = req.query;
        const whereClause = {};

        if (isReturned !== undefined) {
            whereClause.isReturned = isReturned === "true";
        }
        if (studentId) {
            whereClause.studentId = studentId;
        }

        const issuedBooks = await prisma.issuedBook.findMany({
            where: whereClause,
            include: {
                student: { select: { rollNo: true, department: true, user: { select: { username: true, email: true } } } },
                book: { select: { id: true, title: true, author: true, isbn: true } },
                fines: true
            },
            orderBy: { issueDate: "desc" }
        });

        return res.status(200).json({ success: true, count: issuedBooks.length, issuedBooks });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch issued books.", error: error.message });
    }
};

/**
 * @desc Issue a book to a student
 * @route POST /api/issued-books
 */
export const issueBook = async (req, res) => {
    try {
        const { studentId, bookId } = req.body;
        if (!studentId || !bookId) {
            return res.status(400).json({ success: false, message: "studentId (Roll No) and bookId are required." });
        }

        const parsedBookId = parseInt(bookId, 10);

        // 1. Verify student exists
        const student = await prisma.student.findUnique({ where: { rollNo: studentId } });
        if (!student) {
            return res.status(404).json({ success: false, message: `Student ${studentId} not found.` });
        }

        // 2. Fetch library constants
        const constants = await prisma.libraryConstants.findFirst() || { maxBorrowDays: 14, maxBooksPerStudent: 3 };

        // 3. Check active borrowings limit
        const activeCount = await prisma.issuedBook.count({
            where: { studentId, isReturned: false }
        });

        if (activeCount >= constants.maxBooksPerStudent) {
            return res.status(400).json({
                success: false,
                message: `Student has reached the maximum borrowing limit of ${constants.maxBooksPerStudent} books.`
            });
        }

        // 4. Check if student has an active reservation for this book
        let reservedStatus = await prisma.status.findFirst({ where: { status: "Reserved" } });
        let completedStatus = await prisma.status.findFirst({ where: { status: "Completed" } });
        if (!completedStatus) {
            completedStatus = await prisma.status.create({ data: { status: "Completed" } });
        }

        const activeReservation = reservedStatus ? await prisma.bookReservation.findFirst({
            where: {
                studentId,
                bookId: parsedBookId,
                statusId: reservedStatus.id
            }
        }) : null;

        const availability = await prisma.bookAvailability.findFirst({
            where: { bookId: parsedBookId }
        });

        // If not previously reserved, verify stock is available
        if (!activeReservation) {
            if (!availability || availability.availableCopies <= 0) {
                return res.status(400).json({ success: false, message: "Book is currently out of stock / unavailable." });
            }
        }

        // 5. Calculate due date
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + constants.maxBorrowDays);

        // Perform transaction
        const result = await prisma.$transaction(async (tx) => {
            // Decrement available copies ONLY if the copy was not already held by an active reservation
            if (!activeReservation && availability) {
                await tx.bookAvailability.update({
                    where: { id: availability.id },
                    data: { availableCopies: Math.max(0, availability.availableCopies - 1) }
                });
            }

            // If the student had an active reservation, mark it as Completed so it doesn't expire later
            if (activeReservation) {
                await tx.bookReservation.update({
                    where: { id: activeReservation.id },
                    data: { statusId: completedStatus.id }
                });
            }

            // Create IssuedBook
            const issued = await tx.issuedBook.create({
                data: {
                    bookId: parsedBookId,
                    studentId,
                    issueDate,
                    dueDate,
                    isReturned: false,
                    renewalCount: 0
                },
                include: {
                    student: { select: { rollNo: true, user: { select: { username: true } } } },
                    book: { select: { id: true, title: true, isbn: true } }
                }
            });

            // Create BorrowHistory record
            await tx.borrowHistory.create({
                data: {
                    studentId,
                    bookId: parsedBookId,
                    issueDate
                }
            });

            return issued;
        });

        try {
            await refreshStudentRecommendations(studentId);
        } catch (recommendationError) {
            console.error("Failed to refresh student recommendations after issue:", recommendationError);
        }

        return res.status(201).json({
            success: true,
            message: activeReservation
                ? "Book issued successfully and reservation marked as completed."
                : "Book issued successfully.",
            issuedBook: result,
            reservationClaimed: !!activeReservation
        });

    } catch (error) {
        console.error("Error issuing book:", error);
        return res.status(500).json({ success: false, message: "Failed to issue book.", error: error.message });
    }
};

/**
 * @desc Return an issued book (calculates fine if overdue)
 * @route POST /api/issued-books/:id/return
 */
export const returnBook = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const issuedRecord = await prisma.issuedBook.findUnique({
            where: { id },
            include: { book: true, student: true }
        });

        if (!issuedRecord) {
            return res.status(404).json({ success: false, message: "Issued book record not found." });
        }
        if (issuedRecord.isReturned) {
            return res.status(400).json({ success: false, message: "Book has already been returned." });
        }

        const returnDate = new Date();
        const dueDate = new Date(issuedRecord.dueDate);
        const availabilityBefore = issuedRecord.bookId
            ? await prisma.bookAvailability.findFirst({ where: { bookId: issuedRecord.bookId } })
            : null;
        const constants = await prisma.libraryConstants.findFirst() || { overdueFinePerDay: 5.00 };

        let fineCreated = null;

        // Check if overdue
        if (returnDate > dueDate) {
            const diffTime = Math.abs(returnDate - dueDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const fineAmount = diffDays * Number(constants.overdueFinePerDay);

            let fineType = await prisma.fineType.findFirst({ where: { type: "Overdue Return" } });
            if (!fineType) {
                fineType = await prisma.fineType.create({ data: { type: "Overdue Return" } });
            }

            fineCreated = {
                studentId: issuedRecord.studentId,
                issuedBookId: issuedRecord.id,
                fineTypeId: fineType.id,
                amount: fineAmount,
                description: `Overdue return by ${diffDays} day(s) @ ₹${constants.overdueFinePerDay}/day.`
            };
        }

        // Perform transaction
        const result = await prisma.$transaction(async (tx) => {
            // Mark as returned
            const updated = await tx.issuedBook.update({
                where: { id },
                data: { isReturned: true, returnDate }
            });

            // Update BorrowHistory returnDate
            const history = await tx.borrowHistory.findFirst({
                where: { studentId: issuedRecord.studentId, bookId: issuedRecord.bookId, returnDate: null }
            });
            if (history) {
                await tx.borrowHistory.update({
                    where: { id: history.id },
                    data: { returnDate }
                });
            }

            // Increment book availability copies
            if (issuedRecord.bookId) {
                const availability = await tx.bookAvailability.findFirst({ where: { bookId: issuedRecord.bookId } });
                if (availability) {
                    await tx.bookAvailability.update({
                        where: { id: availability.id },
                        data: { availableCopies: availability.availableCopies + 1 }
                    });
                }
            }

            // Handle fine creation or update
            const existingFines = await tx.fine.findMany({
                where: { issuedBookId: issuedRecord.id },
                include: { payments: true },
                orderBy: { issueDate: "desc" }
            });
            const existingFine = existingFines.find((fine) => !fine.isPaid);
            const latestPaymentDate = existingFines
                .flatMap((fine) => fine.payments || [])
                .map((payment) => new Date(payment.paymentDate))
                .sort((a, b) => b - a)[0];

            let fine = null;
            if (fineCreated) {
                if (existingFine) {
                    const accruedDays = latestPaymentDate
                        ? getCalendarDaysSince(latestPaymentDate, returnDate)
                        : null;
                    fine = await tx.fine.update({
                        where: { id: existingFine.id },
                        data: {
                            amount: (accruedDays === null ? fineCreated.amount : accruedDays * Number(constants.overdueFinePerDay)),
                            description: accruedDays === null
                                ? fineCreated.description
                                : `Overdue book loan by ${accruedDays} day(s) since last payment @ ₹${constants.overdueFinePerDay}/day.`
                        }
                    });
                } else if (latestPaymentDate) {
                    const accruedDays = getCalendarDaysSince(latestPaymentDate, returnDate);
                    if (accruedDays > 0) {
                        fine = await tx.fine.create({
                            data: {
                                ...fineCreated,
                                amount: accruedDays * Number(constants.overdueFinePerDay),
                                description: `Overdue return by ${accruedDays} day(s) since last payment @ ₹${constants.overdueFinePerDay}/day.`
                            }
                        });
                    } else {
                        fine = existingFines[0] || null;
                    }
                } else {
                    fine = await tx.fine.create({ data: fineCreated });
                }
            } else if (existingFine) {
                fine = existingFine;
            }

            return { updated, fine };
        });

        if (issuedRecord.bookId && availabilityBefore?.availableCopies <= 0) {
            notifyBookAvailability(issuedRecord.bookId);
        }
        return res.status(200).json({
            success: true,
            message: "Book returned successfully.",
            returnDetails: result.updated,
            fineGenerated: result.fine
        });

    } catch (error) {
        console.error("Error returning book:", error);
        return res.status(500).json({ success: false, message: "Failed to return book.", error: error.message });
    }
};

/**
 * @desc Renew an issued book loan
 * @route POST /api/issued-books/:id/renew
 */
export const renewBook = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const issuedRecord = await prisma.issuedBook.findUnique({ where: { id } });

        if (!issuedRecord) {
            return res.status(404).json({ success: false, message: "Issued book record not found." });
        }
        if (issuedRecord.isReturned) {
            return res.status(400).json({ success: false, message: "Cannot renew a returned book." });
        }

        const constants = await prisma.libraryConstants.findFirst() || { maxRenewals: 2, renewalExtendsDays: 7 };

        if (issuedRecord.renewalCount >= constants.maxRenewals) {
            return res.status(400).json({
                success: false,
                message: `Maximum renewal limit of ${constants.maxRenewals} reached.`
            });
        }

        const newDueDate = new Date(issuedRecord.dueDate);
        newDueDate.setDate(newDueDate.getDate() + constants.renewalExtendsDays);

        const updated = await prisma.issuedBook.update({
            where: { id },
            data: {
                dueDate: newDueDate,
                renewalCount: issuedRecord.renewalCount + 1
            }
        });

        return res.status(200).json({
            success: true,
            message: `Book loan renewed successfully by ${constants.renewalExtendsDays} days.`,
            issuedBook: updated
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to renew book.", error: error.message });
    }
};
