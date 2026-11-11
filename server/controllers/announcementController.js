import prisma from "../config/db.js";
import { getDepartmentVariants, normalizeDepartment, STUDENT_DEPARTMENTS } from "../constants/academicOptions.js";

const parseExpiresAt = (value) => {
    if (!value) return null;
    const expiresAt = new Date(value);
    if (Number.isNaN(expiresAt.getTime())) {
        return undefined;
    }
    return expiresAt;
};

export const getAnnouncements = async (req, res) => {
    try {
        const now = new Date();
        const isLibrarian = req.auth?.role?.toLowerCase() === "librarian";
        const audienceFilters = [{ audienceType: "all" }];

        if (req.auth?.role?.toLowerCase() === "student") {
            const student = await prisma.student.findUnique({
                where: { email: req.user.email },
                select: {
                    department: true,
                    yearOfStudy: true,
                    issuedBooks: { where: { isReturned: false, dueDate: { lt: now } }, select: { id: true }, take: 1 },
                    reservations: { where: { status: { status: "Reserved" } }, select: { id: true }, take: 1 }
                }
            });
            if (!student) {
                return res.status(404).json({ success: false, message: "Student profile not found." });
            }

            audienceFilters.push(
                { audienceType: "department", targetDepartment: { in: getDepartmentVariants(student.department) } },
                { audienceType: "year", targetYear: student.yearOfStudy },
                ...(student.issuedBooks.length ? [{ audienceType: "overdue" }] : []),
                ...(student.reservations.length ? [{ audienceType: "reserved" }] : [])
            );
        }

        const announcements = await prisma.announcement.findMany({
            where: {
                AND: [
                    ...(isLibrarian ? [] : [
                        { isActive: true },
                        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
                    ]),
                    ...(req.auth?.role?.toLowerCase() === "student" ? [{ OR: audienceFilters }] : [])
                ]
            },
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
        if (req.auth?.role?.toLowerCase() !== "librarian") {
            return res.status(403).json({ success: false, message: "Librarian access is required." });
        }

        const { title, content, audienceType = "all", targetDepartment, targetYear, imageUrl, expiresAt } = req.body;
        const validAudienceTypes = ["all", "department", "year", "overdue", "reserved"];
        if (!title || !content) {
            return res.status(400).json({ success: false, message: "Title and content are required." });
        }
        if (!validAudienceTypes.includes(audienceType)) {
            return res.status(400).json({ success: false, message: "Invalid announcement audience." });
        }
        if (audienceType === "department" && !STUDENT_DEPARTMENTS.includes(normalizeDepartment(targetDepartment))) {
            return res.status(400).json({ success: false, message: "Please select a valid department." });
        }
        const parsedYear = targetYear === undefined || targetYear === "" ? null : Number(targetYear);
        if (audienceType === "year" && (!Number.isInteger(parsedYear) || parsedYear < 1)) {
            return res.status(400).json({ success: false, message: "A valid year is required for this audience." });
        }
        const parsedExpiresAt = parseExpiresAt(expiresAt);
        if (parsedExpiresAt === undefined) {
            return res.status(400).json({ success: false, message: "A valid expiry date is required." });
        }

        const librarian = await prisma.librarian.findUnique({
            where: { email: req.user.email },
            select: { staffId: true }
        });
        if (!librarian) {
            return res.status(403).json({ success: false, message: "Librarian profile not found." });
        }

        const announcement = await prisma.announcement.create({
            data: {
                title: String(title).trim(),
                content: String(content).trim(),
                librarianId: librarian.staffId,
                audienceType,
                targetDepartment: audienceType === "department" ? normalizeDepartment(targetDepartment) : null,
                targetYear: audienceType === "year" ? parsedYear : null,
                imageUrl: imageUrl || null,
                expiresAt: parsedExpiresAt
            }
        });

        return res.status(201).json({ success: true, message: "Announcement published successfully.", announcement });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create announcement.", error: error.message });
    }
};

export const updateAnnouncement = async (req, res) => {
    try {
        if (req.auth?.role?.toLowerCase() !== "librarian") {
            return res.status(403).json({ success: false, message: "Librarian access is required." });
        }

        const id = parseInt(req.params.id, 10);
        const { title, content, audienceType, targetDepartment, targetYear, imageUrl, expiresAt } = req.body;
        const validAudienceTypes = ["all", "department", "year", "overdue", "reserved"];
        if (!title || !content || !validAudienceTypes.includes(audienceType)) {
            return res.status(400).json({ success: false, message: "Title, content, and a valid audience are required." });
        }
        if (audienceType === "department" && !STUDENT_DEPARTMENTS.includes(normalizeDepartment(targetDepartment))) {
            return res.status(400).json({ success: false, message: "Please select a valid department." });
        }
        const parsedYear = targetYear === undefined || targetYear === "" ? null : Number(targetYear);
        if (audienceType === "year" && (!Number.isInteger(parsedYear) || parsedYear < 1)) {
            return res.status(400).json({ success: false, message: "A valid year is required for this audience." });
        }
        const parsedExpiresAt = parseExpiresAt(expiresAt);
        if (parsedExpiresAt === undefined) {
            return res.status(400).json({ success: false, message: "A valid expiry date is required." });
        }

        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                title: String(title).trim(),
                content: String(content).trim(),
                audienceType,
                targetDepartment: audienceType === "department" ? normalizeDepartment(targetDepartment) : null,
                targetYear: audienceType === "year" ? parsedYear : null,
                imageUrl: imageUrl || null,
                expiresAt: parsedExpiresAt
            }
        });
        return res.status(200).json({ success: true, message: "Announcement updated successfully.", announcement });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update announcement.", error: error.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        if (req.auth?.role?.toLowerCase() !== "librarian") {
            return res.status(403).json({ success: false, message: "Librarian access is required." });
        }
        const id = parseInt(req.params.id, 10);
        await prisma.announcement.delete({ where: { id } });
        return res.status(200).json({ success: true, message: "Announcement deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete announcement.", error: error.message });
    }
};
