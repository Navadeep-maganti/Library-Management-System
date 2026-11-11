import prisma from "../config/db.js";
import { sendBookAvailabilityEmail } from "./emailService.js";

const processAvailabilityNotifications = async (bookId) => {
    try {
        const subscriptions = await prisma.bookAvailabilitySubscription.findMany({
            where: { bookId },
            include: {
                student: { include: { user: { select: { username: true, email: true } } } },
                book: { select: { title: true } }
            }
        });

        if (!subscriptions.length) return;

        const alerts = await prisma.$transaction(
            subscriptions.map((subscription) =>
                prisma.bookAvailabilityAlert.create({
                    data: {
                        studentId: subscription.studentId,
                        bookId: subscription.bookId,
                        title: "Book available again",
                        content: `"${subscription.book.title}" is available to reserve now.`
                    }
                })
            )
        );

        await prisma.bookAvailabilitySubscription.deleteMany({
            where: { id: { in: subscriptions.map(({ id }) => id) } }
        });

        const emailResults = await Promise.allSettled(
            subscriptions.map((subscription) =>
                sendBookAvailabilityEmail(
                    subscription.student.user.email,
                    subscription.student.user.username,
                    subscription.book.title
                )
            )
        );

        const successfulEmailIds = [];
        emailResults.forEach((result, index) => {
            if (result.status === "fulfilled") successfulEmailIds.push(alerts[index].id);
            else console.error(`Availability email failed for alert ${alerts[index].id}:`, result.reason);
        });

        if (successfulEmailIds.length) {
            await prisma.bookAvailabilityAlert.updateMany({
                where: { id: { in: successfulEmailIds } },
                data: { emailSent: true }
            });
        }
    } catch (error) {
        console.error(`Availability notification processing failed for book ${bookId}:`, error);
    }
};

export const retryUnsentAvailabilityEmails = async () => {
    const alerts = await prisma.bookAvailabilityAlert.findMany({
        where: { emailSent: false },
        include: {
            student: { include: { user: { select: { username: true, email: true } } } },
            book: { select: { title: true } }
        },
        take: 100,
        orderBy: { createdAt: "asc" }
    });

    await Promise.allSettled(alerts.map(async (alert) => {
        try {
            await sendBookAvailabilityEmail(
                alert.student.user.email,
                alert.student.user.username,
                alert.book.title
            );
            await prisma.bookAvailabilityAlert.update({
                where: { id: alert.id },
                data: { emailSent: true }
            });
        } catch (error) {
            console.error(`Availability email retry failed for alert ${alert.id}:`, error);
        }
    }));
};

export const notifyBookAvailability = (bookId) => {
    setImmediate(() => {
        processAvailabilityNotifications(bookId);
    });
};
