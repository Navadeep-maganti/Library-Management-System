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
        from: `"NIT Andhra Library" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your Email Verification OTP - NIT Andhra Library System",
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
