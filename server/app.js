import express from "express";
import cors from "cors";
import pool from "./config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.status(200).json({ success: true, message: "Server is running" });
});

app.post("/api/auth/login", async (req, res) => {
    const { role, password, student_roll_no, email } = req.body || {};

    if (!role || !password || (!student_roll_no && !email)) {
        return res.status(400).json({
            success: false,
            message: "Role, password, and identifier are required."
        });
    }

    try {
        await pool.query("SELECT 1");
    } catch (dbError) {
        console.warn("Database not connected; continuing in mock login mode.", dbError.message);
    }

    return res.status(200).json({
        success: true,
        message: "Login request received successfully",
        role,
        identifier: student_roll_no || email
    });
});

export default app;
