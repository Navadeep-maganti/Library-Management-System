import express from "express";
import { getLibraryAnalytics } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
router.use(requireAuth);
router.get("/", getLibraryAnalytics);

export default router;
