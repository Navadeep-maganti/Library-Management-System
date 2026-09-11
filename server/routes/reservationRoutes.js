import express from "express";
import {
    getReservations,
    createReservation,
    cancelReservation,
    verifyReservationToken,
    triggerExpiredCheck,
    getStudentReservationQuota
} from "../controllers/reservationController.js";

const router = express.Router();

// GET /api/reservations/quota/:studentId - Get daily remaining quota for student
router.get("/quota/:studentId", getStudentReservationQuota);

// GET /api/reservations - Get all reservations with active 30-minute timers
router.get("/", getReservations);

// POST /api/reservations - Reserve a book (holds stock copy for 30 minutes with daily rate limits)
router.post("/", createReservation);

// PATCH /api/reservations/:id/cancel - Cancel reservation and restore stock copy
router.patch("/:id/cancel", cancelReservation);

// POST /api/reservations/verify-token - Verify token before issuing physical book
router.post("/verify-token", verifyReservationToken);

// POST /api/reservations/check-expired - Manually trigger check & release of expired reservations
router.post("/check-expired", triggerExpiredCheck);

export default router;
