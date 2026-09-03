import prisma from "../config/db.js";

export const getLibraryConstants = async (req, res) => {
    try {
        let constants = await prisma.libraryConstants.findFirst();
        if (!constants) {
            constants = await prisma.libraryConstants.create({
                data: {
                    maxBorrowDays: 14,
                    maxBooksPerStudent: 3,
                    overdueFinePerDay: 5.00,
                    maxRenewals: 2,
                    renewalExtendsDays: 7
                }
            });
        }
        return res.status(200).json({ success: true, constants });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch library constants.", error: error.message });
    }
};

export const updateLibraryConstants = async (req, res) => {
    try {
        let constants = await prisma.libraryConstants.findFirst();
        const { maxBorrowDays, maxBooksPerStudent, overdueFinePerDay, maxRenewals, renewalExtendsDays } = req.body;

        if (!constants) {
            constants = await prisma.libraryConstants.create({
                data: {
                    maxBorrowDays: maxBorrowDays ? parseInt(maxBorrowDays, 10) : 14,
                    maxBooksPerStudent: maxBooksPerStudent ? parseInt(maxBooksPerStudent, 10) : 3,
                    overdueFinePerDay: overdueFinePerDay ? Number(overdueFinePerDay) : 5.00,
                    maxRenewals: maxRenewals ? parseInt(maxRenewals, 10) : 2,
                    renewalExtendsDays: renewalExtendsDays ? parseInt(renewalExtendsDays, 10) : 7
                }
            });
        } else {
            constants = await prisma.libraryConstants.update({
                where: { id: constants.id },
                data: {
                    ...(maxBorrowDays !== undefined && { maxBorrowDays: parseInt(maxBorrowDays, 10) }),
                    ...(maxBooksPerStudent !== undefined && { maxBooksPerStudent: parseInt(maxBooksPerStudent, 10) }),
                    ...(overdueFinePerDay !== undefined && { overdueFinePerDay: Number(overdueFinePerDay) }),
                    ...(maxRenewals !== undefined && { maxRenewals: parseInt(maxRenewals, 10) }),
                    ...(renewalExtendsDays !== undefined && { renewalExtendsDays: parseInt(renewalExtendsDays, 10) })
                }
            });
        }

        return res.status(200).json({ success: true, message: "Library policy constants updated.", constants });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update library constants.", error: error.message });
    }
};
