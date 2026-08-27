import prisma from "../config/db.js";
import { validateEmailDomain, generateOTP } from "../utils/authHelpers.js";
import { sendOTPEmail } from "../services/emailService.js";

export const sendOTP = async (req, res) => {
    const { email, role } = req.body;
    try {
        if (!email || !role) {
            return res.status(400).json({ success: false, message: "Email and role are required" });
        }
        if (!validateEmailDomain(email, role)) {
            return res.status(400).json({ success: false, message: "Invalid email domain" });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // OTP generation and expiration (10min)
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.otp.deleteMany({
            where: { email }
        });

        await prisma.otp.create({
            data: {
                email,
                otp,
                expiresAt
            }
        });

        await sendOTPEmail(email, otp);

        res.status(200).json({ message: "OTP has been successfully sent to you email." });
    } catch (error) {
        console.log("Error in sending OTP:", error);
        res.status(500).json({ message: "Failed to send OTP. Please try again later." });
    }
};

export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required." });
        }

        const validOtp = await prisma.otp.findFirst({
            where: {
                email,
                otp,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (!validOtp) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        await prisma.otp.updateMany({
            where: { email },
            data: { isVerified: true }
        });

        res.status(200).json({ message: "OTP verified successfully. You can now proceed to register." });

    } catch (error) {
        console.log("Error in OTP verification:", error);
        res.status(500).json({ message: "Failed to verify OTP. Please try again." });
    }
};