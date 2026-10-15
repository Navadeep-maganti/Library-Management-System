import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    getProfile,
    getProfileSummary,
    updateProfile,
    updateUsername,
    sendPasswordChangeOTP,
    verifyPasswordChangeOTP,
    updatePassword
} from "../controllers/profileController.js";

const router = express.Router();

// All profile endpoints require valid authentication
router.use(requireAuth);

// Profile management endpoints
router.get("/", getProfile);
router.put("/", updateProfile);
router.patch("/", updateProfile);
router.get("/summary", getProfileSummary);
router.patch("/username", updateUsername);
router.put("/username", updateUsername);

// Password change endpoints
router.post("/password/send-otp", sendPasswordChangeOTP);
router.post("/password/verify-otp", verifyPasswordChangeOTP);
router.patch("/password", updatePassword);
router.put("/password", updatePassword);
router.post("/change-password", updatePassword);
router.put("/change-password", updatePassword);
router.patch("/change-password", updatePassword);

export default router;
