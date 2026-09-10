import prisma from "../config/db.js";

/**
 * Helper: Processes all active reservations older than 30 minutes,
 * marks them as 'Expired', and restores the reserved copy back into available stock.
 */
export const processExpiredReservations = async () => {
    try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Fetch or create 'Reserved' and 'Expired' statuses
        let reservedStatus = await prisma.status.findFirst({ where: { status: "Reserved" } });
        let expiredStatus = await prisma.status.findFirst({ where: { status: "Expired" } });
        if (!expiredStatus) {
            expiredStatus = await prisma.status.create({ data: { status: "Expired" } });
        }

        if (!reservedStatus) {
            return { success: true, expiredCount: 0, restoredCount: 0 };
        }

        // Find all active reservations that have exceeded the 30-minute window
        const expiredReservations = await prisma.bookReservation.findMany({
            where: {
                statusId: reservedStatus.id,
                reservedDate: { lt: thirtyMinutesAgo }
            }
        });

        if (expiredReservations.length === 0) {
            return { success: true, expiredCount: 0, restoredCount: 0 };
        }

        let restoredCount = 0;
        for (const resv of expiredReservations) {
            await prisma.$transaction(async (tx) => {
                // 1. Update reservation status to Expired
                await tx.bookReservation.update({
                    where: { id: resv.id },
                    data: { statusId: expiredStatus.id }
                });

                // 2. Return the reserved book back into available stock
                if (resv.bookId) {
                    const availability = await tx.bookAvailability.findFirst({
                        where: { bookId: resv.bookId }
                    });

                    if (availability) {
                        const newAvailable = Math.min(
                            availability.totalCopies,
                            availability.availableCopies + 1
                        );
                        await tx.bookAvailability.update({
                            where: { id: availability.id },
                            data: { availableCopies: newAvailable }
                        });
                        restoredCount++;
                    }
                }
            });
        }

        if (restoredCount > 0) {
            console.log(`⏱️ [Auto-Expiry] Processed ${expiredReservations.length} expired reservation(s) and restored ${restoredCount} book copy/copies back into available stock.`);
        }

        return {
            success: true,
            expiredCount: expiredReservations.length,
            restoredCount
        };
    } catch (error) {
        console.error("Error processing expired reservations:", error);
        return { success: false, error: error.message };
    }
};

/**
 * @desc Get all reservations with real-time expiration calculations and 30-minute claim timer
 * @route GET /api/reservations
 */
export const getReservations = async (req, res) => {
    try {
        // Automatically synchronize and expire overdue reservations first
        await processExpiredReservations();

        const { studentId, bookId, status } = req.query;
        const whereClause = {};

        if (studentId) whereClause.studentId = studentId;
        if (bookId) whereClause.bookId = parseInt(bookId, 10);
        if (status) whereClause.status = { status };

        const reservations = await prisma.bookReservation.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        rollNo: true,
                        department: true,
                        yearOfStudy: true,
                        user: { select: { username: true, email: true } }
                    }
                },
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        isbn: true,
                        availabilities: {
                            include: {
                                shelf: { select: { id: true, section: true, rackNumber: true } }
                            }
                        }
                    }
                },
                status: true
            },
            orderBy: { reservedDate: "desc" }
        });

        const now = Date.now();
        const enrichedReservations = reservations.map((resv) => {
            const reservedTime = new Date(resv.reservedDate).getTime();
            const expiresTime = reservedTime + 30 * 60 * 1000; // 30 minutes
            const remainingMs = Math.max(0, expiresTime - now);
            const isExpired = now >= expiresTime;

            const minutesRemaining = Math.floor(remainingMs / 60000);
            const secondsRemaining = Math.floor((remainingMs % 60000) / 1000);

            // Generate user-friendly verification token
            const token = `TOK-${resv.id.toString().padStart(4, "0")}`;

            return {
                ...resv,
                token,
                expiresAt: new Date(expiresTime).toISOString(),
                remainingMs,
                minutesRemaining,
                secondsRemaining,
                formattedRemaining: `${String(minutesRemaining).padStart(2, "0")}:${String(secondsRemaining).padStart(2, "0")}`,
                isExpired
            };
        });

        return res.status(200).json({
            success: true,
            count: enrichedReservations.length,
            reservations: enrichedReservations
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservations.",
            error: error.message
        });
    }
};

/**
 * @desc Create a new book reservation with 30-minute hold window and anti-spam constraints
 * @route POST /api/reservations
 */
export const createReservation = async (req, res) => {
    try {
        // Synchronize expired reservations first
        await processExpiredReservations();

        const { studentId, bookId } = req.body;
        if (!studentId || !bookId) {
            return res.status(400).json({
                success: false,
                message: "studentId (Roll No) and bookId are required."
            });
        }

        const parsedBookId = parseInt(bookId, 10);
        if (isNaN(parsedBookId)) {
            return res.status(400).json({ success: false, message: "Invalid book ID." });
        }

        // 1. Verify student exists
        const student = await prisma.student.findUnique({
            where: { rollNo: studentId },
            include: { user: { select: { username: true, email: true } } }
        });
        if (!student) {
            return res.status(404).json({ success: false, message: `Student ${studentId} not found.` });
        }

        // 2. Verify book exists
        const book = await prisma.book.findUnique({
            where: { id: parsedBookId },
            include: {
                availabilities: {
                    include: { shelf: true }
                }
            }
        });
        if (!book) {
            return res.status(404).json({ success: false, message: "Book not found." });
        }

        // 3. Check stock availability
        const availability = book.availabilities?.[0];
        if (!availability || availability.availableCopies <= 0) {
            return res.status(400).json({
                success: false,
                message: `Book "${book.title}" is currently out of stock and cannot be reserved.`
            });
        }

        // 4. Fetch or create 'Reserved' status
        let reservedStatus = await prisma.status.findFirst({ where: { status: "Reserved" } });
        if (!reservedStatus) {
            reservedStatus = await prisma.status.create({ data: { status: "Reserved" } });
        }

        // 5. Anti-Spam / Rate-Limiting Constraints per Day
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Constraint A: Maximum 5 reservation requests per student per day across all books
        const totalReservationsToday = await prisma.bookReservation.count({
            where: {
                studentId,
                reservedDate: { gte: startOfDay }
            }
        });

        if (totalReservationsToday >= 5) {
            return res.status(429).json({
                success: false,
                limitExceeded: "DAILY_STUDENT_QUOTA",
                message: "Daily reservation limit reached: You can only make a maximum of 5 reservation requests per day.",
                totalUsedToday: totalReservationsToday,
                maxDailyAllowed: 5
            });
        }

        // Constraint B: Maximum 2 reservation requests for the same book per student per day
        const bookReservationsToday = await prisma.bookReservation.count({
            where: {
                studentId,
                bookId: parsedBookId,
                reservedDate: { gte: startOfDay }
            }
        });

        if (bookReservationsToday >= 2) {
            return res.status(429).json({
                success: false,
                limitExceeded: "DAILY_BOOK_QUOTA",
                message: `Daily limit reached for this book: You can only reserve "${book.title}" a maximum of 2 times per day.`,
                bookUsedToday: bookReservationsToday,
                maxPerBookAllowed: 2
            });
        }

        // 6. Check if student already has an active reservation for this book
        const existingActiveReservation = await prisma.bookReservation.findFirst({
            where: {
                studentId,
                bookId: parsedBookId,
                statusId: reservedStatus.id
            }
        });
        if (existingActiveReservation) {
            return res.status(400).json({
                success: false,
                message: `You already have an active reservation for "${book.title}". Please claim it before it expires.`
            });
        }

        // 7. Calculate queue position
        const currentQueueCount = await prisma.bookReservation.count({
            where: { bookId: parsedBookId, statusId: reservedStatus.id }
        });

        const reservedDate = new Date();
        const expiresAt = new Date(reservedDate.getTime() + 30 * 60 * 1000);

        // 8. Atomically create reservation and decrement available stock by 1
        const result = await prisma.$transaction(async (tx) => {
            // Decrement available copies
            const updatedAvailability = await tx.bookAvailability.update({
                where: { id: availability.id },
                data: { availableCopies: Math.max(0, availability.availableCopies - 1) }
            });

            // Create reservation record
            const newReservation = await tx.bookReservation.create({
                data: {
                    studentId,
                    bookId: parsedBookId,
                    reservedDate,
                    queuePosition: currentQueueCount + 1,
                    statusId: reservedStatus.id
                },
                include: {
                    student: { select: { rollNo: true, user: { select: { username: true, email: true } } } },
                    book: { select: { id: true, title: true, author: true, isbn: true } },
                    status: true
                }
            });

            return { reservation: newReservation, availability: updatedAvailability };
        });

        const token = `TOK-${result.reservation.id.toString().padStart(4, "0")}`;

        return res.status(201).json({
            success: true,
            message: `Book "${book.title}" reserved successfully! Please collect and claim it within 30 minutes.`,
            token,
            reservation: {
                ...result.reservation,
                token,
                expiresAt: expiresAt.toISOString(),
                minutesAllowed: 30,
                remainingMs: 30 * 60 * 1000
            },
            updatedStock: {
                totalCopies: result.availability.totalCopies,
                availableCopies: result.availability.availableCopies
            }
        });

    } catch (error) {
        console.error("Error creating reservation:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create reservation.",
            error: error.message
        });
    }
};

/**
 * @desc Cancel a reservation and immediately return the reserved book copy back into available stock
 * @route PATCH /api/reservations/:id/cancel
 */
export const cancelReservation = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: "Invalid reservation ID." });
        }

        const reservation = await prisma.bookReservation.findUnique({
            where: { id },
            include: { status: true, book: true }
        });

        if (!reservation) {
            return res.status(404).json({ success: false, message: "Reservation not found." });
        }

        // Fetch or create statuses
        let cancelledStatus = await prisma.status.findFirst({ where: { status: "Cancelled" } });
        if (!cancelledStatus) {
            cancelledStatus = await prisma.status.create({ data: { status: "Cancelled" } });
        }

        // Only restore stock if the reservation was active ('Reserved')
        const wasActive = reservation.status?.status === "Reserved";

        const result = await prisma.$transaction(async (tx) => {
            // Update reservation status
            const updated = await tx.bookReservation.update({
                where: { id },
                data: { statusId: cancelledStatus.id },
                include: {
                    status: true,
                    book: { select: { id: true, title: true } },
                    student: { select: { rollNo: true, user: { select: { username: true } } } }
                }
            });

            let updatedAvailability = null;
            if (wasActive && reservation.bookId) {
                const availability = await tx.bookAvailability.findFirst({
                    where: { bookId: reservation.bookId }
                });

                if (availability) {
                    updatedAvailability = await tx.bookAvailability.update({
                        where: { id: availability.id },
                        data: {
                            availableCopies: Math.min(
                                availability.totalCopies,
                                availability.availableCopies + 1
                            )
                        }
                    });
                }
            }

            return { updated, updatedAvailability };
        });

        return res.status(200).json({
            success: true,
            message: "Reservation cancelled successfully and book copy returned to stock.",
            reservation: result.updated,
            updatedStock: result.updatedAvailability ? {
                totalCopies: result.updatedAvailability.totalCopies,
                availableCopies: result.updatedAvailability.availableCopies
            } : undefined
        });

    } catch (error) {
        console.error("Error cancelling reservation:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel reservation.",
            error: error.message
        });
    }
};

/**
 * @desc Verify and validate a student reservation token
 * @route POST /api/reservations/verify-token
 */
export const verifyReservationToken = async (req, res) => {
    try {
        await processExpiredReservations();

        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required." });
        }

        // Clean token format: 'TOK-0042' -> 42
        const rawToken = token.trim().toUpperCase();
        const numericMatch = rawToken.match(/\d+/);
        const reservationId = numericMatch ? parseInt(numericMatch[0], 10) : null;

        let reservation = null;
        if (reservationId) {
            reservation = await prisma.bookReservation.findUnique({
                where: { id: reservationId },
                include: {
                    student: {
                        include: { user: { select: { username: true, email: true } } }
                    },
                    book: {
                        include: {
                            availabilities: { include: { shelf: true } }
                        }
                    },
                    status: true
                }
            });
        }

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: `Invalid token. No reservation found for code "${token}".`
            });
        }

        const now = Date.now();
        const reservedTime = new Date(reservation.reservedDate).getTime();
        const expiresTime = reservedTime + 30 * 60 * 1000;
        const isExpired = now >= expiresTime || reservation.status?.status === "Expired";

        if (isExpired) {
            return res.status(400).json({
                success: false,
                isExpired: true,
                message: "This reservation has expired (exceeded 30 minutes window). The book has been returned to available stock.",
                reservation
            });
        }

        if (reservation.status?.status !== "Reserved") {
            return res.status(400).json({
                success: false,
                message: `Reservation is no longer active. Current status: ${reservation.status?.status}.`
            });
        }

        const remainingMs = Math.max(0, expiresTime - now);

        return res.status(200).json({
            success: true,
            message: "Reservation token verified successfully!",
            verificationDetails: {
                reservationId: reservation.id,
                token: rawToken,
                studentName: reservation.student?.user?.username,
                rollNo: reservation.studentId,
                email: reservation.student?.user?.email,
                department: reservation.student?.department,
                bookId: reservation.book?.id,
                bookTitle: reservation.book?.title,
                author: reservation.book?.author,
                isbn: reservation.book?.isbn,
                shelf: reservation.book?.availabilities?.[0]?.shelf,
                reservedDate: reservation.reservedDate,
                expiresAt: new Date(expiresTime).toISOString(),
                minutesRemaining: Math.floor(remainingMs / 60000),
                secondsRemaining: Math.floor((remainingMs % 60000) / 1000)
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to verify token.",
            error: error.message
        });
    }
};

/**
 * @desc Explicitly trigger check for expired reservations and restore stock
 * @route POST /api/reservations/check-expired
 */
export const triggerExpiredCheck = async (req, res) => {
    try {
        const result = await processExpiredReservations();
        return res.status(200).json({
            success: true,
            message: `Expired reservations check complete.`,
            ...result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to process expired reservations.",
            error: error.message
        });
    }
};

/**
 * @desc Get student's current daily reservation quota usage & remaining allowances
 * @route GET /api/reservations/quota/:studentId
 */
export const getStudentReservationQuota = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { bookId } = req.query;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const totalUsedToday = await prisma.bookReservation.count({
            where: {
                studentId,
                reservedDate: { gte: startOfDay }
            }
        });

        let bookUsedToday = 0;
        if (bookId) {
            bookUsedToday = await prisma.bookReservation.count({
                where: {
                    studentId,
                    bookId: parseInt(bookId, 10),
                    reservedDate: { gte: startOfDay }
                }
            });
        }

        const maxDaily = 5;
        const maxPerBook = 2;

        return res.status(200).json({
            success: true,
            studentId,
            quota: {
                totalDailyLimit: maxDaily,
                totalUsedToday,
                totalRemainingToday: Math.max(0, maxDaily - totalUsedToday),
                maxPerBookDailyLimit: maxPerBook,
                ...(bookId && {
                    bookId: parseInt(bookId, 10),
                    bookUsedToday,
                    bookRemainingToday: Math.max(0, maxPerBook - bookUsedToday)
                })
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservation quota.",
            error: error.message
        });
    }
};
