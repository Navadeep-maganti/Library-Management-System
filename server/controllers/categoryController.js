import prisma from "../config/db.js";

export const getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: {
                _count: { select: { books: true } }
            },
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ success: true, count: categories.length, categories });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch categories.", error: error.message });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const category = await prisma.category.findUnique({
            where: { id },
            include: { books: true }
        });
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        return res.status(200).json({ success: true, category });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch category.", error: error.message });
    }
};

export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required." });
        }
        const category = await prisma.category.create({ data: { name } });
        return res.status(201).json({ success: true, message: "Category created successfully.", category });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create category.", error: error.message });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { name } = req.body;
        const category = await prisma.category.update({
            where: { id },
            data: { name }
        });
        return res.status(200).json({ success: true, message: "Category updated.", category });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update category.", error: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await prisma.category.delete({ where: { id } });
        return res.status(200).json({ success: true, message: "Category deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete category.", error: error.message });
    }
};
