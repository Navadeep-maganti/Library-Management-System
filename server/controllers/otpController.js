import pool from "../config/db.js";
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

        //CHeck if user already exists
        const userCheck = await pool.query("SELECT email FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        //OTP generation and expiration (10min)
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query("DELETE FROM otps WHERE email = $1", [email]);
        await pool.query("INSERT INTO otps (email,otp,expires_at) VALUES ($1, $2, $3)", [email, otp, expiresAt]);

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

        const result = await pool.query("SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()", [email, otp]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        await pool.query("UPDATE otps SET is_verified = TRUE WHERE email = $1", [email]);

        res.status(200).json({ message: "OTP verified successfully. You can now proceed to register." });

    }
    catch (error) {
        console.log("Error in OTP verification:", error);
        res.status(500).json({ message: "Failed to verify OTP. Please try again." });
    }
};