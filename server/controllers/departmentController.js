import prisma from "../config/db.js";

export const getDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            include: {
                _count: { select: { books: true } }
            },
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ success: true, count: departments.length, departments });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch departments.", error: error.message });
    }
};

export const getDepartmentById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const department = await prisma.department.findUnique({
            where: { id },
            include: { books: true }
        });
        if (!department) {
            return res.status(404).json({ success: false, message: "Department not found." });
        }
        return res.status(200).json({ success: true, department });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch department.", error: error.message });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Department name is required." });
        }
        const department = await prisma.department.create({ data: { name } });
        return res.status(201).json({ success: true, message: "Department created successfully.", department });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create department.", error: error.message });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { name } = req.body;
        const department = await prisma.department.update({
            where: { id },
            data: { name }
        });
        return res.status(200).json({ success: true, message: "Department updated.", department });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update department.", error: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await prisma.department.delete({ where: { id } });
        return res.status(200).json({ success: true, message: "Department deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete department.", error: error.message });
    }
};
