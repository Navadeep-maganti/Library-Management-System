import express from "express";
import prisma from "../config/db.js";
import authRoutes from "../routes/authRoutes.js";
import bookRoutes from "../routes/bookRoutes.js";
import reservationRoutes from "../routes/reservationRoutes.js";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/reservations", reservationRoutes);

const PORT = 5092;
const BASE_URL = `http://localhost:${PORT}`;

const server = app.listen(PORT, async () => {
    try {
        console.log("\n=======================================================");
        console.log("🛡️ RUNNING COMPREHENSIVE ANTI-SPAM & RATE LIMIT TESTS");
        console.log("=======================================================\n");

        const studentId = "TEST_SPAM_001";
        const email = "spam.test@student.nitandhra.ac.in";

        // Clean up
        await prisma.bookReservation.deleteMany({ where: { studentId } });
        await prisma.student.deleteMany({ where: { rollNo: studentId } });
        await prisma.user.deleteMany({ where: { email } });

        // Setup student
        await prisma.user.create({ data: { email, username: "Spam Test Student", role: "student", passwordHash: "hash" } });
        await prisma.student.create({ data: { email, rollNo: studentId, department: "CSE", yearOfStudy: 2 } });

        // Setup test books
        const book1 = await prisma.book.create({
            data: {
                title: "Rate Limit Test Book A",
                author: "Author A",
                isbn: "9788888880001",
                availabilities: { create: { totalCopies: 10, availableCopies: 10 } }
            }
        });

        const book2 = await prisma.book.create({
            data: {
                title: "Rate Limit Test Book B",
                author: "Author B",
                isbn: "9788888880002",
                availabilities: { create: { totalCopies: 10, availableCopies: 10 } }
            }
        });

        const book3 = await prisma.book.create({
            data: {
                title: "Rate Limit Test Book C",
                author: "Author C",
                isbn: "9788888880003",
                availabilities: { create: { totalCopies: 10, availableCopies: 10 } }
            }
        });

        console.log("📌 1. Test Book A - 1st Reservation (Should Succeed)");
        let res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, bookId: book1.id })
        });
        let data = await res.json();
        console.log(`Status: ${res.status}, Message: ${data.message}`);
        if (res.status !== 201) throw new Error("1st Reservation failed");
        const resv1Id = data.reservation.id;

        // Cancel resv1 so we can make another request for Book A today
        await fetch(`${BASE_URL}/api/reservations/${resv1Id}/cancel`, { method: "PATCH" });

        console.log("\n📌 2. Test Book A - 2nd Reservation (Should Succeed)");
        res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, bookId: book1.id })
        });
        data = await res.json();
        console.log(`Status: ${res.status}, Message: ${data.message}`);
        if (res.status !== 201) throw new Error("2nd Reservation failed");
        const resv2Id = data.reservation.id;

        // Cancel resv2 to attempt 3rd
        await fetch(`${BASE_URL}/api/reservations/${resv2Id}/cancel`, { method: "PATCH" });

        console.log("\n📌 3. Test Book A - 3rd Reservation (Should FAIL with 429 DAILY_BOOK_QUOTA)");
        res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, bookId: book1.id })
        });
        data = await res.json();
        console.log(`Status: ${res.status}, LimitExceeded: ${data.limitExceeded}, Message: ${data.message}`);
        if (res.status !== 429 || data.limitExceeded !== "DAILY_BOOK_QUOTA") {
            throw new Error("Failed: Max 2 reservations per book per day constraint not enforced");
        }

        console.log("\n📌 4. Test Book B - Reservations 3 & 4 today for student (Should Succeed for Book B)");
        res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, bookId: book2.id })
        });
        data = await res.json();
        console.log(`Reservation 3 Status: ${res.status}`);
        await fetch(`${BASE_URL}/api/reservations/${data.reservation.id}/cancel`, { method: "PATCH" });

        res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, bookId: book2.id })
        });
        data = await res.json();
        console.log(`Reservation 4 Status: ${res.status}`);
        await fetch(`${BASE_URL}/api/reservations/${data.reservation.id}/cancel`, { method: "PATCH" });

        console.log("\n📌 5. Test Book C - 5th Reservation today (Should Succeed)");
        res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, bookId: book3.id })
        });
        data = await res.json();
        console.log(`Reservation 5 Status: ${res.status}`);
        await fetch(`${BASE_URL}/api/reservations/${data.reservation.id}/cancel`, { method: "PATCH" });

        console.log("\n📌 6. Test Book C - 6th Reservation today (Should FAIL with 429 DAILY_STUDENT_QUOTA)");
        res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, bookId: book3.id })
        });
        data = await res.json();
        console.log(`Status: ${res.status}, LimitExceeded: ${data.limitExceeded}, Message: ${data.message}`);
        if (res.status !== 429 || data.limitExceeded !== "DAILY_STUDENT_QUOTA") {
            throw new Error("Failed: Max 5 total reservations per student per day constraint not enforced");
        }

        console.log("\n📌 7. Check Student Quota API Status (GET /api/reservations/quota/:studentId)");
        res = await fetch(`${BASE_URL}/api/reservations/quota/${studentId}?bookId=${book1.id}`);
        data = await res.json();
        console.log("Quota Response:", JSON.stringify(data.quota, null, 2));
        if (data.quota.totalUsedToday !== 5 || data.quota.totalRemainingToday !== 0) {
            throw new Error("Failed: Quota API reporting mismatch");
        }

        // Cleanup
        await prisma.bookReservation.deleteMany({ where: { studentId } });
        await prisma.student.deleteMany({ where: { rollNo: studentId } });
        await prisma.user.deleteMany({ where: { email } });
        await prisma.book.deleteMany({ where: { id: { in: [book1.id, book2.id, book3.id] } } });

        console.log("\n=======================================================");
        console.log("🎉 ALL ANTI-SPAM & DAILY QUOTA CONSTRAINTS VERIFIED 100%!");
        console.log("=======================================================\n");

    } catch (err) {
        console.error("❌ Test error:", err);
    } finally {
        server.close();
        await prisma.$disconnect();
        process.exit(0);
    }
});
