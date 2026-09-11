import express from "express";
import cors from "cors";
import path from "path";
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

// Endpoint to download the generated Test Report Word Document
app.get("/api/test-report/download", (req, res) => {
    const reportPath = path.resolve("./API_Test_Report_Auth_and_Books.docx");
    res.download(reportPath, "API_Test_Report_Auth_and_Books.docx", (err) => {
        if (err) {
            res.status(404).json({ message: "Test report document not found. Run 'npm run test:report' first." });
        }
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Server failed to start");
        console.error(err);
    }
}

startServer();