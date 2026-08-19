import express from "express";
import { sendOTP, verifyOTP } from "../controllers/otpController.js";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

// OTP Endpoints
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// Registration Endpoint
router.post("/register", registerUser);
router.post("/login", loginUser);
export default router;
