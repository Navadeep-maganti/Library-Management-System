import prisma from "../config/db.js";

export const getShelves = async (req, res) => {
    try {
        const shelves = await prisma.shelf.findMany({
            include: {
                availabilities: {
                    include: { book: { select: { id: true, title: true, isbn: true } } }
                }
            },
            orderBy: [{ section: "asc" }, { rackNumber: "asc" }]
        });
        return res.status(200).json({ success: true, count: shelves.length, shelves });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch shelves.", error: error.message });
    }
};

export const getShelfById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const shelf = await prisma.shelf.findUnique({
            where: { id },
            include: {
                availabilities: {
                    include: { book: true }
                }
            }
        });
        if (!shelf) {
            return res.status(404).json({ success: false, message: "Shelf not found." });
        }
        return res.status(200).json({ success: true, shelf });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch shelf.", error: error.message });
    }
};

export const createShelf = async (req, res) => {
    try {
        const { section, rackNumber } = req.body;
        if (!section || !rackNumber) {
            return res.status(400).json({ success: false, message: "Section and rack number are required." });
        }
        const shelf = await prisma.shelf.create({ data: { section, rackNumber } });
        return res.status(201).json({ success: true, message: "Shelf created successfully.", shelf });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create shelf.", error: error.message });
    }
};

export const updateShelf = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { section, rackNumber } = req.body;
        const shelf = await prisma.shelf.update({
            where: { id },
            data: {
                ...(section && { section }),
                ...(rackNumber && { rackNumber })
            }
        });
        return res.status(200).json({ success: true, message: "Shelf updated.", shelf });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update shelf.", error: error.message });
    }
};

export const deleteShelf = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await prisma.shelf.delete({ where: { id } });
        return res.status(200).json({ success: true, message: "Shelf deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete shelf.", error: error.message });
    }
};
