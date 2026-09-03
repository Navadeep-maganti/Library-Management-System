import express from "express";
import {
    getFines,
    getFineById,
    payFine
} from "../controllers/fineController.js";

const router = express.Router();

router.get("/", getFines);
router.get("/:id", getFineById);
router.post("/:id/pay", payFine);

export default router;
