import express from "express";
import {
    getLibraryConstants,
    updateLibraryConstants
} from "../controllers/constantController.js";

const router = express.Router();

router.get("/", getLibraryConstants);
router.put("/", updateLibraryConstants);

export default router;
