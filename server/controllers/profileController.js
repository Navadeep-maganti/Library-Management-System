import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { generateOTP } from "../utils/authHelpers.js";
import { sendPasswordChangeOTPEmail } from "../services/emailService.js";

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const OTP_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes

const createSessionToken = (user) => jwt.sign(
    { email: user.email, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
);

/**
 * Format user and role-specific details into a consistent response
 */
const formatProfileResponse = (user) => {
    return {
        email: user.email,
        username: user.username,
        role: user.role,
        ...(user.student && {
            rollNo: user.student.rollNo,
            roll_no: user.student.rollNo,
            department: user.student.department,
            yearOfStudy: user.student.yearOfStudy,
            year_of_study: user.student.yearOfStudy
        }),
        ...(user.librarian && {
            staffId: user.librarian.staffId,
            staff_id: user.librarian.staffId
        })
    };
};

/** GET /api/profile */
export const getProfile = async (req, res) => {
    try {
        const cleanEmail = req.auth.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: cleanEmail },
            include: {
                student: { select: { rollNo: true, department: true, yearOfStudy: true } },
                librarian: { select: { staffId: true } }
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const profile = formatProfileResponse(user);

        return res.status(200).json({
            success: true,
            profile,
            user: profile
        });
    } catch (error) {
        console.error("Error getting profile:", error);
        return res.status(500).json({ success: false, message: "Failed to load profile." });
    }
};

/** GET /api/profile/summary */
export const getProfileSummary = async (req, res) => {
    try {
        const cleanEmail = req.auth.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: cleanEmail },
            include: {
                student: {
                    include: {
                        _count: {
                            select: {
                                issuedBooks: { where: { isReturned: false } },
                                reservations: true,
                                fines: { where: { isPaid: false } }
                            }
                        }
                    }
                },
                librarian: {
                    include: {
                        _count: {
                            select: { announcements: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const profile = formatProfileResponse(user);
        const summary = {
            profile,
            ...(user.student && {
                activeLoansCount: user.student._count.issuedBooks,
                activeReservationsCount: user.student._count.reservations,
                unpaidFinesCount: user.student._count.fines
            }),
            ...(user.librarian && {
                announcementsCount: user.librarian._count.announcements
            })
        };

        return res.status(200).json({ success: true, ...summary });
    } catch (error) {
        console.error("Error getting profile summary:", error);
        return res.status(500).json({ success: false, message: "Failed to load profile summary." });
    }
};

/** PUT or PATCH /api/profile */
export const updateProfile = async (req, res) => {
    try {
        const cleanEmail = req.auth.email.trim().toLowerCase();
        const { username, department } = req.body;
        const yearOfStudy = req.body.yearOfStudy !== undefined ? req.body.yearOfStudy : req.body.year_of_study;

        const user = await prisma.user.findUnique({
            where: { email: cleanEmail },
            include: { student: true, librarian: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Validation
        const userUpdateData = {};
        if (username !== undefined) {
            const trimmedUsername = typeof username === "string" ? username.trim() : "";
            if (trimmedUsername.length < 2 || trimmedUsername.length > 255) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be between 2 and 255 characters."
                });
            }
            userUpdateData.username = trimmedUsername;
        }

        const studentUpdateData = {};
        if (user.role === "student" && user.student) {
            if (department !== undefined) {
                const trimmedDept = typeof department === "string" ? department.trim() : "";
                if (!trimmedDept) {
                    return res.status(400).json({ success: false, message: "Department cannot be empty." });
                }
                studentUpdateData.department = trimmedDept;
            }

            if (yearOfStudy !== undefined) {
                const parsedYear = Number(yearOfStudy);
                if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 6) {
                    return res.status(400).json({
                        success: false,
                        message: "Year of study must be a number between 1 and 6."
                    });
                }
                studentUpdateData.yearOfStudy = parsedYear;
            }
        }

        // Execute updates
        const updatedUser = await prisma.$transaction(async (tx) => {
            if (Object.keys(userUpdateData).length > 0) {
                await tx.user.update({
                    where: { email: cleanEmail },
                    data: userUpdateData
                });
            }

            if (Object.keys(studentUpdateData).length > 0 && user.student) {
                await tx.student.update({
                    where: { rollNo: user.student.rollNo },
                    data: studentUpdateData
                });
            }

            return await tx.user.findUnique({
                where: { email: cleanEmail },
                include: {
                    student: { select: { rollNo: true, department: true, yearOfStudy: true } },
                    librarian: { select: { staffId: true } }
                }
            });
        });

        const profile = formatProfileResponse(updatedUser);
        const newToken = createSessionToken(updatedUser);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            token: newToken,
            profile,
            user: profile
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile." });
    }
};

/** PATCH or PUT /api/profile/username */
export const updateUsername = async (req, res) => {
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    if (username.length < 2 || username.length > 255) {
        return res.status(400).json({ success: false, message: "Username must be between 2 and 255 characters." });
    }

    try {
        const cleanEmail = req.auth.email.trim().toLowerCase();
        const user = await prisma.user.update({
            where: { email: cleanEmail },
            data: { username },
            include: {
                student: { select: { rollNo: true, department: true, yearOfStudy: true } },
                librarian: { select: { staffId: true } }
            }
        });

        const profile = formatProfileResponse(user);
        const newToken = createSessionToken(user);

        return res.status(200).json({
            success: true,
            message: "Username updated successfully.",
            token: newToken,
            profile,
            user: profile
        });
    } catch (error) {
        console.error("Error updating username:", error);
        return res.status(500).json({ success: false, message: "Failed to update username." });
    }
};

/** POST /api/profile/password/send-otp */
export const sendPasswordChangeOTP = async (req, res) => {
    try {
        const cleanEmail = req.auth.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + OTP_LIFETIME_MS);

        // Delete existing OTPs and create new one
        await prisma.$transaction([
            prisma.otp.deleteMany({ where: { email: cleanEmail } }),
            prisma.otp.create({ data: { email: cleanEmail, otp, expiresAt } })
        ]);

        try {
            await sendPasswordChangeOTPEmail(cleanEmail, otp);
        } catch (emailError) {
            console.error("Email service error:", emailError.message);
            // In development or if mail fails, log OTP for developer convenience
            if (process.env.NODE_ENV !== "production") {
                console.log(`[DEV OTP] Password change OTP for ${cleanEmail}: ${otp}`);
            } else {
                return res.status(500).json({
                    success: false,
                    message: "Failed to dispatch OTP email. Please try again later."
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "A password-change OTP has been sent to your registered email address.",
            expiresInSeconds: OTP_LIFETIME_MS / 1000
        });
    } catch (error) {
        console.error("Error sending password-change OTP:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send password-change OTP. Please try again later."
        });
    }
};

/** POST /api/profile/password/verify-otp */
export const verifyPasswordChangeOTP = async (req, res) => {
    const otp = String(req.body.otp || "").trim();
    if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ success: false, message: "A valid 6-digit OTP is required." });
    }

    try {
        const cleanEmail = req.auth.email.trim().toLowerCase();
        const validOtp = await prisma.otp.findFirst({
            where: { email: cleanEmail, otp, expiresAt: { gt: new Date() } }
        });

        if (!validOtp) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        // Consume OTP
        await prisma.otp.delete({ where: { id: validOtp.id } });

        const passwordChangeToken = jwt.sign(
            { email: cleanEmail, purpose: "password-change" },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified. You may now set a new password.",
            passwordChangeToken,
            expiresInSeconds: OTP_LIFETIME_MS / 1000
        });
    } catch (error) {
        console.error("Error verifying password-change OTP:", error);
        return res.status(500).json({ success: false, message: "Failed to verify OTP. Please try again." });
    }
};

/** PATCH or PUT /api/profile/password or POST /api/profile/change-password */
export const updatePassword = async (req, res) => {
    const cleanEmail = req.auth.email.trim().toLowerCase();
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
    const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : (req.body.oldPassword || "");
    const confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";
    const passwordChangeToken = req.body.passwordChangeToken;

    if (!PASSWORD_RULE.test(newPassword)) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters and include 1 uppercase letter and 1 special character."
        });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "New password and confirmation password do not match."
        });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Check verification method: either currentPassword OR passwordChangeToken
        if (currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Current password is incorrect."
                });
            }

            if (currentPassword === newPassword) {
                return res.status(400).json({
                    success: false,
                    message: "New password cannot be the same as your current password."
                });
            }
        } else if (passwordChangeToken) {
            try {
                const verification = jwt.verify(passwordChangeToken, process.env.JWT_SECRET);
                if (verification.purpose !== "password-change" || verification.email !== cleanEmail) {
                    return res.status(403).json({
                        success: false,
                        message: "This password-change verification token is not valid for the signed-in user."
                    });
                }
            } catch (err) {
                return res.status(401).json({
                    success: false,
                    message: "Password-change verification has expired or is invalid. Request and verify a new OTP."
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "Either your current password or an OTP verification token is required to change password."
            });
        }

        // Hash and update password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: cleanEmail },
            data: { passwordHash }
        });

        return res.status(200).json({
            success: true,
            message: "Password updated successfully."
        });
    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(500).json({ success: false, message: "Failed to update password." });
    }
};
