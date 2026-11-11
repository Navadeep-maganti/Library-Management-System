import prisma from "../config/db.js";

const availableCopies = (book) =>
    (book.availabilities || []).reduce((total, availability) => total + availability.availableCopies, 0);

const bookSelect = {
    id: true,
    title: true,
    author: true,
    category: { select: { name: true } },
    availabilities: { select: { availableCopies: true } }
};

export const refreshStudentRecommendations = async (studentId) => {
    const [student, history, currentIssues, books] = await Promise.all([
        prisma.student.findUnique({
            where: { rollNo: studentId },
            select: { rollNo: true, department: true, yearOfStudy: true }
        }),
        prisma.borrowHistory.findMany({
            where: { studentId, bookId: { not: null } },
            select: { bookId: true }
        }),
        prisma.issuedBook.findMany({
            where: { studentId, isReturned: false },
            select: { bookId: true }
        }),
        prisma.book.findMany({
            where: { availabilities: { some: { availableCopies: { gt: 0 } } } },
            select: bookSelect
        })
    ]);

    if (!student) return null;

    const issueCounts = new Map();
    history.forEach(({ bookId }) => issueCounts.set(bookId, (issueCounts.get(bookId) || 0) + 1));
    const historyBookIds = Array.from(issueCounts.keys()).filter(Boolean);
    const currentBookIds = new Set(currentIssues.map(({ bookId }) => bookId).filter(Boolean));
    const historyBooks = await prisma.book.findMany({
        where: { id: { in: historyBookIds } },
        select: { id: true, author: true, category: { select: { name: true } } }
    });

    const categoryScores = new Map();
    const authorScores = new Map();
    historyBooks.forEach((book) => {
        const weight = issueCounts.get(book.id) || 1;
        if (book.category?.name) {
            categoryScores.set(book.category.name, (categoryScores.get(book.category.name) || 0) + weight);
        }
        authorScores.set(book.author, (authorScores.get(book.author) || 0) + weight);
    });

    const recommendations = books
        .filter((book) => !currentBookIds.has(book.id) && !issueCounts.has(book.id))
        .map((book) => {
            const categoryScore = categoryScores.get(book.category?.name) || 0;
            const authorScore = authorScores.get(book.author) || 0;
            return {
                id: book.id,
                title: book.title,
                author: book.author,
                category: book.category,
                availableCopies: availableCopies(book),
                matchReason: authorScore > 0
                    ? `Matches author ${book.author}`
                    : `Matches your ${book.category?.name || "library"} interests`,
                score: (categoryScore * 2) + (authorScore * 3)
            };
        })
        .filter((book) => book.score > 0)
        .sort((first, second) => second.score - first.score || first.title.localeCompare(second.title))
        .slice(0, 6);

    await prisma.studentRecommendationCache.upsert({
        where: { studentId },
        create: { studentId, personalRecommendations: recommendations },
        update: { personalRecommendations: recommendations }
    });

    return { recommendations, department: student.department, yearOfStudy: student.yearOfStudy };
};

export const refreshCohortRecommendations = async (department, yearOfStudy) => {
    const [history] = await Promise.all([
        prisma.borrowHistory.findMany({
            where: {
                student: { department, yearOfStudy },
                bookId: { not: null }
            },
            select: { bookId: true, studentId: true }
        })
    ]);

    const counts = new Map();
    history.forEach(({ bookId, studentId }) => {
        if (!counts.has(bookId)) counts.set(bookId, { issues: 0, students: new Set() });
        const entry = counts.get(bookId);
        entry.issues += 1;
        entry.students.add(studentId);
    });

    const books = await prisma.book.findMany({
        where: {
            id: { in: Array.from(counts.keys()) },
            availabilities: { some: { availableCopies: { gt: 0 } } }
        },
        select: bookSelect
    });

    const recommendations = books
        .map((book) => {
            const count = counts.get(book.id);
            return {
                id: book.id,
                title: book.title,
                author: book.author,
                category: book.category,
                availableCopies: availableCopies(book),
                peerStudentCount: count.students.size,
                score: count.issues
            };
        })
        .sort((first, second) =>
            second.score - first.score ||
            second.peerStudentCount - first.peerStudentCount ||
            first.title.localeCompare(second.title)
        )
        .slice(0, 6);

    await prisma.cohortRecommendationCache.upsert({
        where: { department_yearOfStudy: { department, yearOfStudy } },
        create: { department, yearOfStudy, peerRecommendations: recommendations },
        update: { peerRecommendations: recommendations, generatedAt: new Date() }
    });

    return recommendations;
};

export const refreshAllCohortRecommendations = async () => {
    const cohorts = await prisma.student.findMany({
        distinct: ["department", "yearOfStudy"],
        select: { department: true, yearOfStudy: true }
    });

    for (const cohort of cohorts) {
        await refreshCohortRecommendations(cohort.department, cohort.yearOfStudy);
    }
};
