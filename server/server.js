import express from "express";
import pool from "./config/db.js";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        const client = await pool.connect();
        console.log("✅ Connected to PostgreSQL");
        client.release();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Database connection failed");
        console.error(err);
    }
}

startServer();