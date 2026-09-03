import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import shelfRoutes from "./routes/shelfRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import circulationRoutes from "./routes/circulationRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import fineRoutes from "./routes/fineRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import constantRoutes from "./routes/constantRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.status(200).json({ success: true, message: "Server is running" });
});

// Resource-Oriented API Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/shelves", shelfRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/issued-books", circulationRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/fines", fineRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/constants", constantRoutes);

export default app;
