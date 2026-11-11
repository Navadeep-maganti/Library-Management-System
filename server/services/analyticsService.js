import prisma from "../config/db.js";

const SNAPSHOT_ID = 1;

const emptySnapshot = {
    mostBorrowed: [],
    activeDepartments: [],
    unavailableBooks: [],
    monthlyTrends: [],
    predictedHighDemand: []
};

const loadBorrowingRows = () => prisma.borrowHistory.findMany({
    select: {
        issueDate: true,
        book: { select: { id: true, title: true, author: true } },
        student: { select: { department: true } }
    }
});

const buildBorrowMetrics = (rows) => {
    const books = new Map();
    const departments = new Map();
    const months = new Map();

    rows.forEach((row) => {
        if (row.book) {
            const book = books.get(row.book.id) || { bookId: row.book.id, title: row.book.title, author: row.book.author, borrowCount: 0 };
            book.borrowCount += 1;
            books.set(row.book.id, book);
        }
        if (row.student?.department) {
            departments.set(row.student.department, (departments.get(row.student.department) || 0) + 1);
        }
        const date = new Date(row.issueDate);
        const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        months.set(month, (months.get(month) || 0) + 1);
    });

    return {
        mostBorrowed: [...books.values()].sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 10),
        activeDepartments: [...departments.entries()]
            .map(([department, borrowCount]) => ({ department, borrowCount }))
            .sort((a, b) => b.borrowCount - a.borrowCount)
            .slice(0, 10),
        monthlyTrends: [...months.entries()]
            .sort(([first], [second]) => first.localeCompare(second))
            .slice(-12)
            .map(([month, borrowCount]) => ({ month, borrowCount }))
    };
};

const buildDemandMetrics = async (rows) => {
    const demand = new Map();
    rows.forEach((row) => {
        if (row.book) {
            const item = demand.get(row.book.id) || {
                bookId: row.book.id,
                title: row.book.title,
                author: row.book.author,
                alertSubscribers: 0,
                borrowCount: 0
            };
            item.borrowCount += 1;
            demand.set(row.book.id, item);
        }
    });
    const subscriptions = await prisma.bookAvailabilitySubscription.findMany({
        select: { bookId: true, book: { select: { id: true, title: true, author: true } } }
    });
    subscriptions.forEach(({ bookId, book }) => {
        const item = demand.get(bookId) || { bookId, title: book.title, author: book.author, alertSubscribers: 0, borrowCount: 0 };
        item.alertSubscribers += 1;
        demand.set(bookId, item);
    });
    const unavailableBooks = [...demand.values()]
        .sort((a, b) => b.alertSubscribers - a.alertSubscribers || b.borrowCount - a.borrowCount)
        .slice(0, 10);
    const predictedHighDemand = [...demand.values()]
        .map((item) => ({ ...item, demandScore: item.alertSubscribers * 2 + item.borrowCount }))
        .sort((a, b) => b.demandScore - a.demandScore)
        .slice(0, 10);
    return { unavailableBooks, predictedHighDemand };
};

export const refreshAnalytics = async ({ issue = false, demand = false, monthly = false } = {}) => {
    const existing = await prisma.libraryAnalyticsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } });
    const rows = await loadBorrowingRows();
    const borrowMetrics = issue || monthly || !existing ? buildBorrowMetrics(rows) : {};
    const demandMetrics = demand || !existing ? await buildDemandMetrics(rows) : {};
    const now = new Date();
    const data = {
        mostBorrowed: borrowMetrics.mostBorrowed || existing?.mostBorrowed || emptySnapshot.mostBorrowed,
        activeDepartments: borrowMetrics.activeDepartments || existing?.activeDepartments || emptySnapshot.activeDepartments,
        unavailableBooks: demandMetrics.unavailableBooks || existing?.unavailableBooks || emptySnapshot.unavailableBooks,
        monthlyTrends: borrowMetrics.monthlyTrends || existing?.monthlyTrends || emptySnapshot.monthlyTrends,
        predictedHighDemand: demandMetrics.predictedHighDemand || existing?.predictedHighDemand || emptySnapshot.predictedHighDemand,
        ...(existing?.lastIssueRefreshAt ? { lastIssueRefreshAt: existing.lastIssueRefreshAt } : {}),
        ...(existing?.lastDemandRefreshAt ? { lastDemandRefreshAt: existing.lastDemandRefreshAt } : {}),
        ...(existing?.lastMonthlyRefreshAt ? { lastMonthlyRefreshAt: existing.lastMonthlyRefreshAt } : {}),
        ...(borrowMetrics.monthlyTrends ? { lastMonthlyRefreshAt: now } : {}),
        ...(demandMetrics.unavailableBooks ? { lastDemandRefreshAt: now } : {}),
        ...(issue ? { lastIssueRefreshAt: now } : {})
    };
    return prisma.libraryAnalyticsSnapshot.upsert({
        where: { id: SNAPSHOT_ID },
        create: { id: SNAPSHOT_ID, ...emptySnapshot, ...data, updatedAt: now },
        update: data
    });
};

export const getAnalyticsSnapshot = async () => {
    let snapshot = await prisma.libraryAnalyticsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    if (!snapshot || !snapshot.lastMonthlyRefreshAt || snapshot.lastMonthlyRefreshAt < monthStart) {
        snapshot = await refreshAnalytics({ issue: !snapshot, demand: !snapshot, monthly: true });
    }
    return snapshot;
};
