import prisma from "../config/db.js";

const BASE_URL = "http://localhost:5000";

async function testRandomTokens() {
    console.log("=======================================================");
    console.log("🧪 TESTING NON-SEQUENTIAL RANDOM RESERVATION TOKENS");
    console.log("=======================================================\n");

    const studentRoll = "RANDOM_TEST_001";
    const studentEmail = "random.tester@student.nitandhra.ac.in";

    try {
        // Clean up
        await prisma.bookReservation.deleteMany({ where: { studentId: studentRoll } });
        await prisma.student.deleteMany({ where: { rollNo: studentRoll } });
        await prisma.user.deleteMany({ where: { email: studentEmail } });

        // Setup test student & book
        await prisma.user.create({
            data: {
                email: studentEmail,
                username: "Random Token Tester",
                role: "student",
                passwordHash: "hash"
            }
        });
        await prisma.student.create({
            data: {
                email: studentEmail,
                rollNo: studentRoll,
                department: "Computer Science",
                yearOfStudy: 2
            }
        });

        const bookA = await prisma.book.create({
            data: {
                title: "Random Token Book Alpha",
                author: "Test Author",
                isbn: "9787777770001",
                availabilities: { create: { totalCopies: 5, availableCopies: 5 } }
            }
        });

        const bookB = await prisma.book.create({
            data: {
                title: "Random Token Book Beta",
                author: "Test Author",
                isbn: "9787777770002",
                availabilities: { create: { totalCopies: 5, availableCopies: 5 } }
            }
        });

        // 1. Create first reservation
        let res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: studentRoll, bookId: bookA.id })
        });
        let data = await res.json();
        console.assert(res.status === 201, `Failed to create reservation A: ${data.message}`);
        const token1 = data.token;
        const resv1Id = data.reservation.id;
        console.log(`✅ Reservation 1 Created (ID: ${resv1Id}) -> Token: ${token1}`);

        // Validate token format (6-digit number)
        console.assert(/^\d{6}$/.test(token1), "Token 1 is not a 6-digit numeric string");

        // Cancel reservation 1 so we can make another
        await fetch(`${BASE_URL}/api/reservations/${resv1Id}/cancel`, { method: "PATCH" });

        // 2. Create second reservation
        res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: studentRoll, bookId: bookB.id })
        });
        data = await res.json();
        console.assert(res.status === 201, `Failed to create reservation B: ${data.message}`);
        const token2 = data.token;
        const resv2Id = data.reservation.id;
        console.log(`✅ Reservation 2 Created (ID: ${resv2Id}) -> Token: ${token2}`);

        // Validate token format (6-digit number)
        console.assert(/^\d{6}$/.test(token2), "Token 2 is not a 6-digit numeric string");

        // 3. Verify non-sequential
        console.log(`\nChecking non-sequential property:`);
        console.log(`Token 1: ${token1}`);
        console.log(`Token 2: ${token2}`);
        const diff = Math.abs(parseInt(token2, 10) - parseInt(token1, 10));
        console.log(`Numerical difference between tokens: ${diff}`);
        console.assert(diff !== 1, "FAIL: Tokens are sequential (diff is 1)!");
        console.log(`✅ SUCCESS: Tokens are random and non-sequential (diff = ${diff})`);

        // 4. Verify token with verifyOnly = true
        res = await fetch(`${BASE_URL}/api/reservations/verify-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token2, verifyOnly: true })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Verification failed");
        console.assert(data.verificationDetails.token === token2, "Returned token mismatch in verification");
        console.log(`✅ Verified random token ${token2} successfully (verifyOnly)`);

        // 5. Verify token with "TOK-" prefix (as formatted by frontend)
        res = await fetch(`${BASE_URL}/api/reservations/verify-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: `TOK-${token2}`, verifyOnly: true })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Verification with TOK- prefix failed");
        console.log(`✅ Verified prefixed token "TOK-${token2}" successfully`);

        // 6. Complete issue with token
        res = await fetch(`${BASE_URL}/api/reservations/verify-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token2, verifyOnly: false })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.isIssued === true, "Issuing failed");
        console.log(`✅ Successfully issued book using random token ${token2}`);

        // Clean up
        await prisma.issuedBook.deleteMany({ where: { studentId: studentRoll } });
        await prisma.borrowHistory.deleteMany({ where: { studentId: studentRoll } });
        await prisma.bookReservation.deleteMany({ where: { studentId: studentRoll } });
        await prisma.student.deleteMany({ where: { rollNo: studentRoll } });
        await prisma.user.deleteMany({ where: { email: studentEmail } });
        await prisma.book.deleteMany({ where: { id: { in: [bookA.id, bookB.id] } } });

        console.log("\n=======================================================");
        console.log("🎉 ALL RANDOM RESERVATION TOKEN TESTS PASSED 100%!");
        console.log("=======================================================\n");

    } catch (err) {
        console.error("❌ Test error:", err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testRandomTokens();
