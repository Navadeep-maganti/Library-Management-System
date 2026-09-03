import express from "express";
import {
    getReservations,
    createReservation,
    cancelReservation
} from "../controllers/reservationController.js";

const router = express.Router();

router.get("/", getReservations);
router.post("/", createReservation);
router.patch("/:id/cancel", cancelReservation);

export default router;
