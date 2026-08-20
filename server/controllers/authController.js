import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validateEmailDomain } from "../utils/authHelpers.js";

export const registerUser = async (req, res) => {
    const { email, username, password, role } = req.body;
    const passwordRule = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

    try {
        if (!email || !username || !password) {
            return res.status(400).json({ message: "Email, username, and password are required." });
        }

        if (!passwordRule.test(password)) {
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

        const otpCheck = await pool.query(
            "SELECT is_verified FROM otps WHERE email = $1 AND is_verified = TRUE",
            [cleanEmail]
        );

        if (otpCheck.rows.length === 0) {
            return res.status(400).json({
                message: "Email has not been verified via OTP. Please verify your email first."
            });
        }

        const userExist = await pool.query("SELECT email FROM users WHERE email = $1", [cleanEmail]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: "User is already registered with this email." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            await client.query(
                "INSERT INTO users (email, username, role, password_hash) VALUES ($1, $2, $3, $4)",
                [cleanEmail, username, derivedRole, passwordHash]
            );

            if (derivedRole === "student") {
                await client.query(
                    "INSERT INTO students (email, roll_no, department, year_of_study) VALUES ($1, $2, $3, $4)",
                    [cleanEmail, rollNo, department, yearOfStudy]
                );
            } else {
                await client.query(
                    "INSERT INTO librarian (email, staff_id) VALUES ($1, $2)",
                    [cleanEmail, staffId]
                );
            }

            await client.query("DELETE FROM otps WHERE email = $1", [cleanEmail]);
            await client.query("COMMIT");
        } catch (txnError) {
            await client.query("ROLLBACK");
            throw txnError;
        } finally {
            client.release();
        }

        const token = jwt.sign(
            { email: cleanEmail, role: derivedRole, username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            message: "User registered successfully!",
            token,
            user: { email: cleanEmail, username, role: derivedRole }
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

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const extraDetails = {};
        if (user.role === "student") {
            const studentRes = await pool.query(
                "SELECT roll_no, department, year_of_study FROM students WHERE email = $1",
                [cleanEmail]
            );

            if (studentRes.rows.length === 0) {
                return res.status(400).json({ message: "Student details not found. Please complete registration." });
            }

            const student = studentRes.rows[0];
            extraDetails.roll_no = student.roll_no;
            extraDetails.department = student.department;
            extraDetails.year_of_study = student.year_of_study;
        } else if (user.role === "librarian") {
            const librarianRes = await pool.query("SELECT staff_id FROM librarian WHERE email = $1", [cleanEmail]);
            if (librarianRes.rows.length > 0) {
                extraDetails.staff_id = librarianRes.rows[0].staff_id;
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
