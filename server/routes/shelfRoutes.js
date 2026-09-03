import express from "express";
import {
    getShelves,
    getShelfById,
    createShelf,
    updateShelf,
    deleteShelf
} from "../controllers/shelfController.js";

const router = express.Router();

router.get("/", getShelves);
router.post("/", createShelf);
router.get("/:id", getShelfById);
router.put("/:id", updateShelf);
router.delete("/:id", deleteShelf);

export default router;
