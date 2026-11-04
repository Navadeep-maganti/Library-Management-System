import express from "express";
import {
    getFines,
    getFineById,
    payFine,
    syncFinesEndpoint
} from "../controllers/fineController.js";

const router = express.Router();

router.get("/", getFines);
router.post("/sync", syncFinesEndpoint);
router.get("/:id", getFineById);
router.post("/:id/pay", payFine);

export default router;
