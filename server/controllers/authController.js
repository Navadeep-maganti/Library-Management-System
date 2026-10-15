import prisma from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validateEmailDomain, generateOTP } from "../utils/authHelpers.js";
import { sendPasswordChangeOTPEmail } from "../services/emailService.js";

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export const registerUser = async (req, res) => {
    const { email, username, password, role } = req.body;

    try {
        if (!email || !username || !password) {
            return res.status(400).json({ message: "Email, username, and password are required." });
        }

        if (!PASSWORD_RULE.test(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters and include 1 uppercase letter and 1 special character."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        let derivedRole;
        if (cleanEmail.endsWith("@student.nitandhra.ac.in")) {
            derivedRole = "student";
        } else {
            derivedRole = "librarian";
        }

        if (role && role.toLowerCase() !== derivedRole) {
            return res.status(400).json({
                message: `Role mismatch: The email ${cleanEmail} belongs to role '${derivedRole}'.`
            });
        }

        const rollNo = req.body.roll_no || req.body.rollNo;
        const department = req.body.department || "General";
        const yearOfStudy = req.body.year_of_study || req.body.yearOfStudy || 1;
        const staffId = req.body.staff_id || req.body.staffId || req.body.faculty_id || req.body.facultyId;

        if (derivedRole === "student" && !rollNo) {
            return res.status(400).json({ message: "Student registration requires roll_no." });
        }

        if (derivedRole === "librarian" && !staffId) {
            return res.status(400).json({ message: "Librarian registration requires faculty/staff ID." });
        }

        const verifiedOtp = await prisma.otp.findFirst({
            where: {
                email: cleanEmail,
                isVerified: true
            }
        });

        if (!verifiedOtp) {
            return res.status(400).json({
                message: "Email has not been verified via OTP. Please verify your email first."
            });
        }

        const userExist = await prisma.user.findUnique({
            where: { email: cleanEmail }
        });

        if (userExist) {
            return res.status(400).json({ message: "User is already registered with this email." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.$transaction(async (tx) => {
            await tx.user.create({
                data: {
                    email: cleanEmail,
                    username,
                    role: derivedRole,
                    passwordHash
                }
            });

            if (derivedRole === "student") {
                await tx.student.create({
                    data: {
                        email: cleanEmail,
                        rollNo: String(rollNo),
                        department,
                        yearOfStudy: Number(yearOfStudy)
                    }
                });
            } else {
                await tx.librarian.create({
                    data: {
                        email: cleanEmail,
                        staffId: String(staffId)
                    }
                });
            }

            await tx.otp.deleteMany({
                where: { email: cleanEmail }
            });
        });

        const token = jwt.sign(
            { email: cleanEmail, role: derivedRole, username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            message: "User registered successfully!",
            token,
            user: {
                email: cleanEmail,
                username,
                role: derivedRole,
                ...(derivedRole === "student" && { roll_no: String(rollNo) })
            }
        });
    } catch (error) {
        console.error("Error in registerUser:", error);
        res.status(500).json({ message: "Registration failed. Please try again." });
    }
};

export const loginUser = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const cleanEmail = email.trim().toLowerCase();

        let derivedRole;
        if (validateEmailDomain(cleanEmail, "student")) {
            derivedRole = "student";
        } else if (validateEmailDomain(cleanEmail, "librarian")) {
            derivedRole = "librarian";
        } else {
            return res.status(400).json({ message: "Invalid email domain." });
        }

        if (role && derivedRole !== role.toLowerCase()) {
            return res.status(400).json({ message: "Role mismatch. Please select correct role." });
        }

        const user = await prisma.user.findUnique({
            where: { email: cleanEmail }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const extraDetails = {};
        if (user.role === "student") {
            const student = await prisma.student.findUnique({
                where: { email: cleanEmail }
            });

            if (!student) {
                return res.status(400).json({ message: "Student details not found. Please complete registration." });
            }

            extraDetails.roll_no = student.rollNo;
            extraDetails.department = student.department;
            extraDetails.year_of_study = student.yearOfStudy;
        } else if (user.role === "librarian") {
            const librarian = await prisma.librarian.findUnique({
                where: { email: cleanEmail }
            });
            if (librarian) {
                extraDetails.staff_id = librarian.staffId;
            }
        }

        const token = jwt.sign(
            { email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                email: user.email,
                username: user.username,
                role: user.role,
                ...extraDetails,
            },
        });
    } catch (error) {
        console.error("Error in login", error);
        res.status(500).json({ message: "Login attempt failed. Try again later." });
    }
};

/**
 * Public Forgot Password - Send OTP to registered user
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }
        const cleanEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email." });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.$transaction([
            prisma.otp.deleteMany({ where: { email: cleanEmail } }),
            prisma.otp.create({ data: { email: cleanEmail, otp, expiresAt } })
        ]);

        try {
            await sendPasswordChangeOTPEmail(cleanEmail, otp);
        } catch (emailErr) {
            console.error("Forgot password email error:", emailErr.message);
            if (process.env.NODE_ENV !== "production") {
                console.log(`[DEV OTP] Password reset OTP for ${cleanEmail}: ${otp}`);
            } else {
                return res.status(500).json({
                    success: false,
                    message: "Failed to send reset email. Try again later."
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Password reset OTP has been sent to your email address.",
            expiresInSeconds: 600
        });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        return res.status(500).json({ success: false, message: "Failed to process forgot password request." });
    }
};

/**
 * Public Verify Reset OTP - Generates temporary reset token
 */
export const verifyResetOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required." });
        }
        const cleanEmail = email.trim().toLowerCase();
        const cleanOtp = String(otp).trim();

        const validOtp = await prisma.otp.findFirst({
            where: { email: cleanEmail, otp: cleanOtp, expiresAt: { gt: new Date() } }
        });

        if (!validOtp) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        await prisma.otp.delete({ where: { id: validOtp.id } });

        const resetToken = jwt.sign(
            { email: cleanEmail, purpose: "password-reset" },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully. You may now reset your password.",
            resetToken,
            expiresInSeconds: 600
        });
    } catch (error) {
        console.error("Error in verifyResetOTP:", error);
        return res.status(500).json({ success: false, message: "Failed to verify reset OTP." });
    }
};

/**
 * Public Reset Password with resetToken
 */
export const resetPassword = async (req, res) => {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    try {
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, resetToken, and newPassword are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirmation do not match."
            });
        }

        if (!PASSWORD_RULE.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and include 1 uppercase letter and 1 special character."
            });
        }

        try {
            const verification = jwt.verify(resetToken, process.env.JWT_SECRET);
            if (verification.purpose !== "password-reset" || verification.email !== cleanEmail) {
                return res.status(403).json({ success: false, message: "Invalid reset token for this email." });
            }
        } catch {
            return res.status(401).json({ success: false, message: "Reset token has expired or is invalid." });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: cleanEmail },
            data: { passwordHash }
        });

        return res.status(200).json({
            success: true,
            message: "Password has been successfully reset. You can now login with your new password."
        });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        return res.status(500).json({ success: false, message: "Failed to reset password." });
    }
};
