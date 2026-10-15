import express from "express";
import { sendOTP, verifyOTP } from "../controllers/otpController.js";
import {
    registerUser,
    loginUser,
    forgotPassword,
    verifyResetOTP,
    resetPassword
} from "../controllers/authController.js";

const router = express.Router();

// Registration OTP Endpoints
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// Core Authentication Endpoints
router.post("/register", registerUser);
router.post("/login", loginUser);

// Password Reset Endpoints (Unauthenticated)
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

export default router;
