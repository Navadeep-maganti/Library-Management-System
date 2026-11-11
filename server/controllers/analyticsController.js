import prisma from "../config/db.js";
import { getAnalyticsSnapshot } from "../services/analyticsService.js";

export const getLibraryAnalytics = async (req, res) => {
    try {
        if (req.auth?.role?.toLowerCase() !== "librarian") {
            return res.status(403).json({ success: false, message: "Librarian access is required." });
        }
        const snapshot = await getAnalyticsSnapshot();
        return res.status(200).json({ success: true, analytics: snapshot });
    } catch (error) {
        console.error("Failed to load library analytics:", error);
        return res.status(500).json({ success: false, message: "Failed to load library analytics." });
    }
};
