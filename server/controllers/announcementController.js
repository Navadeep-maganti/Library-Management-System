import prisma from "../config/db.js";

export const getAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            where: { isActive: true },
            include: { librarian: { select: { staffId: true, user: { select: { username: true } } } } },
            orderBy: { createdAt: "desc" }
        });
        return res.status(200).json({ success: true, count: announcements.length, announcements });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch announcements.", error: error.message });
    }
};

export const createAnnouncement = async (req, res) => {
    try {
        const { title, content, librarianId, imageUrl, expiresAt } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, message: "Title and content are required." });
        }

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                librarianId: librarianId || null,
                imageUrl: imageUrl || null,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        });

        return res.status(201).json({ success: true, message: "Announcement published successfully.", announcement });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create announcement.", error: error.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await prisma.announcement.delete({ where: { id } });
        return res.status(200).json({ success: true, message: "Announcement deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete announcement.", error: error.message });
    }
};
