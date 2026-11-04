import express from "express";
import {
    getFines,
    getFineById,
    payFine,
    createRazorpayOrder,
    createAllRazorpayOrder,
    verifyRazorpayPayment
} from "../controllers/fineController.js";

const router = express.Router();

router.get("/", getFines);
router.get("/:id", getFineById);
router.post("/:id/pay", payFine);

// Razorpay Payment Gateway Routes
router.post("/:id/create-razorpay-order", createRazorpayOrder);
router.post("/create-all-order", createAllRazorpayOrder);
router.post("/verify-razorpay-payment", verifyRazorpayPayment);

export default router;

