import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validateEmailDomain } from "../utils/authHelpers.js";

/**
 * Register User (Student or Librarian)
 */
export const registerUser = async (req, res) => {
    const { email, username, password, role } = req.body;
    const passwordRule = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

    try {
        // 1. Basic validation
        if (!email || !username || !password) {
            return res.status(400).json({ message: "Email, username, and password are required." });
        }

        if (!passwordRule.test(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters and include 1 uppercase letter and 1 special character."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 2. Determine and verify role from email domain (Do not blindly trust req.body.role)
        let derivedRole;
        if (cleanEmail.endsWith("@student.nitandhra.ac.in")) {
            derivedRole = "student";
        } else if (cleanEmail.endsWith("@nitandhra.ac.in")) {
            derivedRole = "librarian";
        } else {
            return res.status(400).json({ 
                message: "Invalid email domain. Must be @student.nitandhra.ac.in or @nitandhra.ac.in." 
            });
        }

        // If role was explicitly sent in body, verify it matches derivedRole
        if (role && role.toLowerCase() !== derivedRole) {
            return res.status(400).json({ 
                message: `Role mismatch: The email ${cleanEmail} belongs to role '${derivedRole}'.` 
            });
        }

        // 3. Extract role-specific fields flexibly
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

        // 3. Verify that the email was verified via OTP
        const otpCheck = await pool.query(
            "SELECT is_verified FROM otps WHERE email = $1 AND is_verified = TRUE",
            [email]
        );

        if (otpCheck.rows.length === 0) {
            return res.status(400).json({
                message: "Email has not been verified via OTP. Please verify your email first."
            });
        }

        // 4. Check if user already exists
        const userExist = await pool.query("SELECT email FROM users WHERE email = $1", [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: "User is already registered with this email." });
        }

        // 5. Hash Password using bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 6. DB Transaction to insert into users and (students OR librarian)
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Insert into users
            await client.query(
                "INSERT INTO users (email, username, role, password_hash) VALUES ($1, $2, $3, $4)",
                [email, username, normalizedRole, passwordHash]
            );

            // Insert into students or librarian
            if (normalizedRole === "student") {
                await client.query(
                    "INSERT INTO students (email, roll_no, department, year_of_study) VALUES ($1, $2, $3, $4)",
                    [email, roll_no, department, year_of_study]
                );
            } else if (normalizedRole === "librarian") {
                const staffIdToUse = staff_id || req.body.faculty_id;
                await client.query(
                    "INSERT INTO librarian (email, staff_id) VALUES ($1, $2)",
                    [email, staffIdToUse]
                );
            }

            // Remove verified OTP record after registration
            await client.query("DELETE FROM otps WHERE email = $1", [email]);

            await client.query("COMMIT");
        } catch (txnError) {
            await client.query("ROLLBACK");
            throw txnError;
        } finally {
            client.release();
        }

        // 7. Generate JWT Token
        const token = jwt.sign(
            { email, role: normalizedRole, username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            message: "User registered successfully!",
            token,
            user: { email, username, role: normalizedRole }
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
            return res.status(400).json({ message: "Role mismatch. Please select correct role." })
        }

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const user = userResult[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }
        let extraDetails = {};
        if (user.role === "student") {
            const studentRes = await pool.query("SELECT roll_no, department, year_of_study FROM students WHERE email = $1", [cleanEmail]);
            if (studentRes.rows.length === 0) {
                return res.status(400).json({ message: "Student details not found. Please complete registration." })
            }
            const student = studentRes.rows[0];
            extraDetails.roll_no = student.roll_no;
            extraDetails.department = student.department;
            extraDetails.year_of_study = student.year_of_study;
        } else if (user.role === "librarian") {
            const librarianRes = await pool.query("SELECT staff_id FROM librarian WHERE email = $1", [cleanEmail]);
            if (librarianRes.rows.length > 0) {
                const librarian = librarianRes.rows[0];
                extraDetails.staff_id = librarian.staff_id;
            }
        }

        const token = jwt.sign({ email: user.email, usrname: user.username, roel: user.role }, process.env.JWT_SECRET, { expiresIn: "id" });
        res.status(200).json({
            message: "Login Successfull",
            token,
            user: {
                email: user.email,
                username: user.username,
                role: user.role,
                ...extraDetails
            }
        });

    } catch (error) {
        console.error("Error in login", error);
        res.status(500).json({ message: "Login attempt failed, Try again later" });
    }

};
