import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOTPEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: `"Library management system" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your Email Verification OTP - Library management system",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Email Verification</h2>
                <p>Use the following 6-digit OTP to verify your email address:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #1a73e8;">${otp}</h1>
                <p>This OTP is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.</p>
            </div>
        `,
    };
    return await transporter.sendMail(mailOptions);
};

export const sendPasswordChangeOTPEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: `"Library management system" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Password Change OTP - Library Management System",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Password Change Request</h2>
                <p>Use the following 6-digit OTP to verify your password change:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #1a73e8;">${otp}</h1>
                <p>This OTP is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.</p>
                <p>If you did not request a password change, you can safely ignore this email.</p>
            </div>
        `,
    };
    return await transporter.sendMail(mailOptions);
};

export const sendDueDateReminderEmail = async (toEmail, studentName, bookTitle, dueDate, daysRemaining) => {
    const dueDateText = new Date(dueDate).toLocaleDateString();
    const timing = daysRemaining === 0
        ? "is due today"
        : `is due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
    const mailOptions = {
        from: `"Library management system" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Book due date reminder: ${bookTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Library Due Date Reminder</h2>
                <p>Hello ${studentName || "Student"},</p>
                <p>Your borrowed book <strong>${bookTitle}</strong> ${timing}.</p>
                <p><strong>Due date:</strong> ${dueDateText}</p>
                <p>Please return or renew the book before the due date to avoid overdue fines.</p>
            </div>
        `,
    };
    return await transporter.sendMail(mailOptions);
};
