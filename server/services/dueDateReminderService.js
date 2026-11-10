import prisma from "../config/db.js";
import { sendDueDateReminderEmail } from "./emailService.js";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const REMINDER_DAYS = [5, 3, 1, 0];

const calendarDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export const processDueDateReminders = async () => {
    const now = new Date();
    const activeLoans = await prisma.issuedBook.findMany({
        where: { isReturned: false },
        include: {
            student: { include: { user: { select: { username: true, email: true } } } },
            book: { select: { title: true } }
        }
    });

    for (const loan of activeLoans) {
        const daysRemaining = Math.floor((calendarDay(new Date(loan.dueDate)) - calendarDay(now)) / MILLISECONDS_PER_DAY);
        if (!REMINDER_DAYS.includes(daysRemaining)) continue;

        const title = daysRemaining === 0
            ? "Book due today"
            : `Book due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
        const content = `${loan.book?.title || "Your borrowed book"} is due on ${new Date(loan.dueDate).toLocaleDateString()}. Return or renew it before the due date to avoid fines.`;
        const alert = await prisma.studentAlert.upsert({
            where: { issuedBookId_reminderDays: { issuedBookId: loan.id, reminderDays: daysRemaining } },
            create: {
                studentId: loan.studentId,
                issuedBookId: loan.id,
                reminderDays: daysRemaining,
                title,
                content
            },
            update: { title, content }
        });

        if (!alert.emailSent) {
            try {
                await sendDueDateReminderEmail(
                    loan.student.user.email,
                    loan.student.user.username,
                    loan.book?.title || "your borrowed book",
                    loan.dueDate,
                    daysRemaining
                );
                await prisma.studentAlert.update({
                    where: { id: alert.id },
                    data: { emailSent: true }
                });
            } catch (error) {
                console.error(`Failed to send due-date reminder for issued book ${loan.id}:`, error);
            }
        }
    }
};
