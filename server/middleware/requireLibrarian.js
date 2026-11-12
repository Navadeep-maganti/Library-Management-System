import { requireAuth } from "./requireAuth.js";

export const requireLibrarian = [
    requireAuth,
    (req, res, next) => {
        if (req.auth?.role?.toLowerCase() !== "librarian") {
            return res.status(403).json({ success: false, message: "Librarian access is required." });
        }
        return next();
    }
];
