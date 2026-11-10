import express from "express";
import { getStudentAlerts, markStudentAlertRead } from "../controllers/alertController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getStudentAlerts);
router.post("/:id/read", markStudentAlertRead);

export default router;
