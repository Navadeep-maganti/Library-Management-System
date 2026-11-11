import express from "express";
import { getStudentAlerts, markStudentAlertRead } from "../controllers/alertController.js";
import {
    getBookAvailabilitySubscription,
    subscribeToBookAvailability,
    unsubscribeFromBookAvailability
} from "../controllers/availabilityAlertController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getStudentAlerts);
router.get("/availability/:bookId", getBookAvailabilitySubscription);
router.post("/availability/:bookId", subscribeToBookAvailability);
router.delete("/availability/:bookId", unsubscribeFromBookAvailability);
router.post("/:id/read", markStudentAlertRead);

export default router;
