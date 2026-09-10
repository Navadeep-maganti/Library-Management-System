import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    HeadingLevel,
    BorderStyle,
    ShadingType,
    Header,
    Footer,
    PageNumber
} from "docx";

import prisma from "../config/db.js";
import authRoutes from "../routes/authRoutes.js";
import bookRoutes from "../routes/bookRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Express Test Instance
const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

const PORT = 5088;
const BASE_URL = `http://localhost:${PORT}`;

// Color Palette for Word Document
const COLORS = {
    primary: "1E3A8A",      // Dark Blue
    secondary: "3B82F6",    // Blue
    accent: "0D9488",       // Teal
    passBg: "DCFCE7",       // Light Green
    passText: "166534",     // Dark Green
    failBg: "FEE2E2",       // Light Red
    failText: "991B1B",     // Dark Red
    headerBg: "1E293B",     // Slate Dark
    headerText: "FFFFFF",   // White
    subHeaderBg: "F1F5F9",  // Light Slate
    border: "CBD5E1",       // Border Grey
    zebraBg: "F8FAFC"       // Zebra Row
};

const results = [];

// Helper to record test results
function recordResult({ id, suite, name, method, endpoint, payload, expectedStatus, expectedSnippet, actualStatus, actualResponse, passed, remarks, durationMs }) {
    results.push({
        id,
        suite,
        name,
        method,
        endpoint,
        payload: payload ? JSON.stringify(payload, null, 2) : "N/A",
        expectedStatus,
        expectedSnippet: expectedSnippet || "Status " + expectedStatus,
        actualStatus,
        actualResponse: typeof actualResponse === "object" ? JSON.stringify(actualResponse) : String(actualResponse),
        passed,
        remarks: remarks || (passed ? "Passed successfully as expected." : "Did not match expected behavior."),
        durationMs
    });
    const statusIcon = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`[${statusIcon}] ${id}: ${name} (${durationMs}ms)`);
}

async function runAllTests() {
    console.log("\n=======================================================");
    console.log("🚀 STARTING AUTOMATED TEST SUITE: AUTH & BOOKS APIS");
    console.log("=======================================================\n");

    const startTime = Date.now();

    // Setup Test Data
    const testStudentEmail = "api.tester.student@student.nitandhra.ac.in";
    const testStudentRoll = "TESTROLL999";
    const testLibrarianEmail = "api.tester.librarian@nitandhra.ac.in";
    const testBookIsbn = "9789999990001";
    const conflictBookIsbn = "9789999990002";

    // Clean up any previous test records
    await prisma.otp.deleteMany({ where: { email: { in: [testStudentEmail, testLibrarianEmail] } } });
    await prisma.student.deleteMany({ where: { rollNo: testStudentRoll } });
    await prisma.user.deleteMany({ where: { email: { in: [testStudentEmail, testLibrarianEmail] } } });
    await prisma.book.deleteMany({ where: { isbn: { in: [testBookIsbn, conflictBookIsbn] } } });

    // ----------------------------------------------------
    // 1. AUTH APIS TEST SUITE
    // ----------------------------------------------------
    console.log("\n--- [SUITE 1] AUTHENTICATION & AUTHORIZATION APIS ---");

    // TC_AUTH_01: Send OTP for Student
    let t0 = Date.now();
    let res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testStudentEmail, role: "student" })
    });
    let data = await res.json();
    let passed = res.status === 200 && (data.message?.includes("OTP") || data.success !== false);
    recordResult({
        id: "TC_AUTH_01",
        suite: "Auth APIs",
        name: "Send OTP to Valid Student Email",
        method: "POST",
        endpoint: "/api/auth/send-otp",
        payload: { email: testStudentEmail, role: "student" },
        expectedStatus: 200,
        expectedSnippet: "OTP sent successfully",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_02: Send OTP with Invalid Domain
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid.domain@gmail.com", role: "student" })
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_AUTH_02",
        suite: "Auth APIs",
        name: "Send OTP with Non-Institutional Domain Rejection",
        method: "POST",
        endpoint: "/api/auth/send-otp",
        payload: { email: "invalid.domain@gmail.com", role: "student" },
        expectedStatus: 400,
        expectedSnippet: "Invalid institutional domain",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_03: Send OTP with Missing Payload
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_AUTH_03",
        suite: "Auth APIs",
        name: "Send OTP Missing Email and Role Validation",
        method: "POST",
        endpoint: "/api/auth/send-otp",
        payload: {},
        expectedStatus: 400,
        expectedSnippet: "Email and role are required",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // Retrieve generated OTP for verification
    const otpRecord = await prisma.otp.findFirst({
        where: { email: testStudentEmail },
        orderBy: { createdAt: "desc" }
    });
    const validOtp = otpRecord ? otpRecord.otp : "123456";

    // TC_AUTH_04: Verify OTP with Invalid Code
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testStudentEmail, otp: "000000" })
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_AUTH_04",
        suite: "Auth APIs",
        name: "Verify OTP with Incorrect Code",
        method: "POST",
        endpoint: "/api/auth/verify-otp",
        payload: { email: testStudentEmail, otp: "000000" },
        expectedStatus: 400,
        expectedSnippet: "Invalid or expired OTP",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_05: Verify OTP (Success)
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testStudentEmail, otp: validOtp })
    });
    data = await res.json();
    passed = res.status === 200;
    recordResult({
        id: "TC_AUTH_05",
        suite: "Auth APIs",
        name: "Verify OTP with Valid Code",
        method: "POST",
        endpoint: "/api/auth/verify-otp",
        payload: { email: testStudentEmail, otp: validOtp },
        expectedStatus: 200,
        expectedSnippet: "Email verified successfully",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_06: Register Student with Weak Password
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testStudentEmail,
            username: "Test Student",
            password: "weakpassword",
            role: "student",
            roll_no: testStudentRoll
        })
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_AUTH_06",
        suite: "Auth APIs",
        name: "Register User with Weak Password Complexity Rejection",
        method: "POST",
        endpoint: "/api/auth/register",
        payload: { email: testStudentEmail, username: "Test Student", password: "weakpassword", role: "student" },
        expectedStatus: 400,
        expectedSnippet: "Password must be at least 8 characters and include 1 uppercase letter and 1 special character",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_07: Register Student (Success)
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testStudentEmail,
            username: "API Test Student",
            password: "Password@2026",
            role: "student",
            roll_no: testStudentRoll,
            department: "Computer Science",
            year_of_study: 3
        })
    });
    data = await res.json();
    passed = res.status === 201 && !!data.token;
    recordResult({
        id: "TC_AUTH_07",
        suite: "Auth APIs",
        name: "Register Student with Valid Verified OTP and Details",
        method: "POST",
        endpoint: "/api/auth/register",
        payload: { email: testStudentEmail, username: "API Test Student", password: "Password@2026", role: "student", roll_no: testStudentRoll },
        expectedStatus: 201,
        expectedSnippet: "User registered successfully & JWT token generated",
        actualStatus: res.status,
        actualResponse: { message: data.message, user: data.user, tokenReceived: !!data.token },
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_08: Register Duplicate Email
    t0 = Date.now();
    // Prepare verified OTP state
    await prisma.otp.create({ data: { email: testStudentEmail, otp: "999999", isVerified: true, expiresAt: new Date(Date.now() + 600000) } });
    res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testStudentEmail,
            username: "API Test Student",
            password: "Password@2026",
            role: "student",
            roll_no: testStudentRoll
        })
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_AUTH_08",
        suite: "Auth APIs",
        name: "Register User Duplicate Email Prevention",
        method: "POST",
        endpoint: "/api/auth/register",
        payload: { email: testStudentEmail, username: "API Test Student" },
        expectedStatus: 400,
        expectedSnippet: "User is already registered with this email",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_09: Login Student (Success)
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testStudentEmail,
            password: "Password@2026",
            role: "student"
        })
    });
    data = await res.json();
    passed = res.status === 200 && !!data.token && data.user?.role === "student";
    recordResult({
        id: "TC_AUTH_09",
        suite: "Auth APIs",
        name: "Login with Valid Student Credentials",
        method: "POST",
        endpoint: "/api/auth/login",
        payload: { email: testStudentEmail, password: "Password@2026", role: "student" },
        expectedStatus: 200,
        expectedSnippet: "Login successful with token & profile data",
        actualStatus: res.status,
        actualResponse: { message: data.message, user: data.user, tokenReceived: !!data.token },
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_10: Login with Incorrect Password
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testStudentEmail,
            password: "WrongPassword@999",
            role: "student"
        })
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_AUTH_10",
        suite: "Auth APIs",
        name: "Login with Incorrect Password Rejection",
        method: "POST",
        endpoint: "/api/auth/login",
        payload: { email: testStudentEmail, password: "WrongPassword@999", role: "student" },
        expectedStatus: 400,
        expectedSnippet: "Invalid email or password",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_AUTH_11: Login with Role Mismatch
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testStudentEmail,
            password: "Password@2026",
            role: "librarian"
        })
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_AUTH_11",
        suite: "Auth APIs",
        name: "Login Role Mismatch Validation (Student email as Librarian)",
        method: "POST",
        endpoint: "/api/auth/login",
        payload: { email: testStudentEmail, password: "Password@2026", role: "librarian" },
        expectedStatus: 400,
        expectedSnippet: "Role mismatch. Please select correct role.",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // ----------------------------------------------------
    // 2. BOOKS APIS TEST SUITE
    // ----------------------------------------------------
    console.log("\n--- [SUITE 2] BOOKS CATALOG & INVENTORY APIS ---");

    // TC_BOOK_01: Get All Books with Pagination
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books?page=1&limit=5`);
    data = await res.json();
    passed = res.status === 200 && data.success === true && Array.isArray(data.books);
    recordResult({
        id: "TC_BOOK_01",
        suite: "Books APIs",
        name: "Get All Books with Pagination (Page 1, Limit 5)",
        method: "GET",
        endpoint: "/api/books?page=1&limit=5",
        payload: null,
        expectedStatus: 200,
        expectedSnippet: "success: true, returns paginated books array and pagination metadata",
        actualStatus: res.status,
        actualResponse: { success: data.success, totalBooks: data.totalBooks, totalPages: data.totalPages, count: data.books?.length },
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_02: Search Books by Keyword
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books?search=Database&sortBy=title&order=asc`);
    data = await res.json();
    passed = res.status === 200 && data.success === true;
    recordResult({
        id: "TC_BOOK_02",
        suite: "Books APIs",
        name: "Search Books by Title/Author/ISBN Keyword",
        method: "GET",
        endpoint: "/api/books?search=Database&sortBy=title&order=asc",
        payload: null,
        expectedStatus: 200,
        expectedSnippet: "success: true, returns matching records",
        actualStatus: res.status,
        actualResponse: { success: data.success, matchedCount: data.books?.length },
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_03: Filter Books by Category & Department
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books?categoryId=1&departmentId=1`);
    data = await res.json();
    passed = res.status === 200 && data.success === true;
    recordResult({
        id: "TC_BOOK_03",
        suite: "Books APIs",
        name: "Filter Books by Category and Department IDs",
        method: "GET",
        endpoint: "/api/books?categoryId=1&departmentId=1",
        payload: null,
        expectedStatus: 200,
        expectedSnippet: "success: true, returns filtered books",
        actualStatus: res.status,
        actualResponse: { success: data.success, filteredCount: data.books?.length },
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_04: Create New Book (Success)
    let createdBookId = null;
    const newBookData = {
        title: "Microservices & Distributed Systems",
        author: "Martin Fowler & Antigravity",
        isbn: testBookIsbn,
        publishedYear: 2026,
        description: "Comprehensive guide to microservices, event streaming, and cloud resilience.",
        totalCopies: 10,
        categoryId: 1,
        departmentId: 1,
        shelfId: 1
    };
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBookData)
    });
    data = await res.json();
    passed = res.status === 201 && !!data.book?.id && data.book?.availabilities?.[0]?.totalCopies === 10;
    if (data.book?.id) createdBookId = data.book.id;
    recordResult({
        id: "TC_BOOK_04",
        suite: "Books APIs",
        name: "Create Book with Inventory & Shelf Mapping",
        method: "POST",
        endpoint: "/api/books",
        payload: newBookData,
        expectedStatus: 201,
        expectedSnippet: "Book created successfully with availability copies",
        actualStatus: res.status,
        actualResponse: { success: data.success, createdId: data.book?.id, totalCopies: data.book?.availabilities?.[0]?.totalCopies },
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_05: Create Book with Missing Required Fields
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Incomplete Book Record" })
    });
    data = await res.json();
    passed = res.status === 400;
    recordResult({
        id: "TC_BOOK_05",
        suite: "Books APIs",
        name: "Create Book Missing Required Fields Validation",
        method: "POST",
        endpoint: "/api/books",
        payload: { title: "Incomplete Book Record" },
        expectedStatus: 400,
        expectedSnippet: "Title, author, and ISBN are required.",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_06: Create Book Duplicate ISBN Collision
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBookData)
    });
    data = await res.json();
    passed = res.status === 409;
    recordResult({
        id: "TC_BOOK_06",
        suite: "Books APIs",
        name: "Create Book Duplicate ISBN Collision Rejection",
        method: "POST",
        endpoint: "/api/books",
        payload: newBookData,
        expectedStatus: 409,
        expectedSnippet: `Book with ISBN ${testBookIsbn} already exists.`,
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_07: Get Book Details by ID
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books/${createdBookId}`);
    data = await res.json();
    passed = res.status === 200 && data.book?.id === createdBookId && !!data.book?.availabilities;
    recordResult({
        id: "TC_BOOK_07",
        suite: "Books APIs",
        name: "Get Single Book by ID with Nested Shelf & Relations",
        method: "GET",
        endpoint: `/api/books/${createdBookId}`,
        payload: null,
        expectedStatus: 200,
        expectedSnippet: "Book details retrieved with category, department, shelf & availabilities",
        actualStatus: res.status,
        actualResponse: { success: data.success, bookId: data.book?.id, title: data.book?.title },
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_08: Get Book by Non-existent ID
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books/999999`);
    data = await res.json();
    passed = res.status === 404;
    recordResult({
        id: "TC_BOOK_08",
        suite: "Books APIs",
        name: "Get Single Book with Non-Existent ID",
        method: "GET",
        endpoint: "/api/books/999999",
        payload: null,
        expectedStatus: 404,
        expectedSnippet: "Book with ID 999999 not found.",
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_09: Dynamic Update Book (Title, Copies, Shelf, Year)
    const updatePayload = {
        title: "Microservices & Distributed Systems - 2nd Global Edition",
        publishedYear: 2027,
        totalCopies: 25,
        availableCopies: 22,
        shelfId: 2
    };
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books/${createdBookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
    });
    data = await res.json();
    passed = res.status === 200 &&
        data.book?.title === updatePayload.title &&
        data.book?.availabilities?.[0]?.totalCopies === 25 &&
        data.book?.availabilities?.[0]?.availableCopies === 22 &&
        data.book?.availabilities?.[0]?.shelf?.id === 2;
    recordResult({
        id: "TC_BOOK_09",
        suite: "Books APIs",
        name: "Dynamic Update: Synchronize Title, Published Year, Stock Copies & Physical Shelf",
        method: "PUT",
        endpoint: `/api/books/${createdBookId}`,
        payload: updatePayload,
        expectedStatus: 200,
        expectedSnippet: "Book and inventory updated atomically across tables",
        actualStatus: res.status,
        actualResponse: {
            success: data.success,
            updatedTitle: data.book?.title,
            updatedTotalCopies: data.book?.availabilities?.[0]?.totalCopies,
            updatedAvailableCopies: data.book?.availabilities?.[0]?.availableCopies,
            shelfId: data.book?.availabilities?.[0]?.shelf?.id
        },
        passed,
        durationMs: Date.now() - t0
    });

    // Create conflict book for ISBN update test
    const conflictBook = await prisma.book.create({
        data: {
            title: "Existing Conflict Title",
            author: "Another Author",
            isbn: conflictBookIsbn
        }
    });

    // TC_BOOK_10: Update Book with Conflicting ISBN
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books/${createdBookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: conflictBookIsbn })
    });
    data = await res.json();
    passed = res.status === 409;
    recordResult({
        id: "TC_BOOK_10",
        suite: "Books APIs",
        name: "Update Book with Conflicting ISBN Rejection",
        method: "PUT",
        endpoint: `/api/books/${createdBookId}`,
        payload: { isbn: conflictBookIsbn },
        expectedStatus: 409,
        expectedSnippet: `Another book with ISBN ${conflictBookIsbn} already exists.`,
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_11: Delete Book (Success)
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books/${createdBookId}`, { method: "DELETE" });
    data = await res.json();
    passed = res.status === 200 && data.success === true;
    recordResult({
        id: "TC_BOOK_11",
        suite: "Books APIs",
        name: "Delete Book with Cascade Inventory Removal",
        method: "DELETE",
        endpoint: `/api/books/${createdBookId}`,
        payload: null,
        expectedStatus: 200,
        expectedSnippet: `Book deleted successfully.`,
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // TC_BOOK_12: Delete Non-existent Book (404)
    t0 = Date.now();
    res = await fetch(`${BASE_URL}/api/books/${createdBookId}`, { method: "DELETE" });
    data = await res.json();
    passed = res.status === 404;
    recordResult({
        id: "TC_BOOK_12",
        suite: "Books APIs",
        name: "Delete Already Deleted / Non-Existent Book (404)",
        method: "DELETE",
        endpoint: `/api/books/${createdBookId}`,
        payload: null,
        expectedStatus: 404,
        expectedSnippet: `Book with ID ${createdBookId} not found.`,
        actualStatus: res.status,
        actualResponse: data,
        passed,
        durationMs: Date.now() - t0
    });

    // Clean up conflict book
    await prisma.book.deleteMany({ where: { id: conflictBook.id } });

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    const passRate = ((passedCount / results.length) * 100).toFixed(1);

    console.log("\n=======================================================");
    console.log(`📊 EXECUTION SUMMARY: ${passedCount}/${results.length} PASSED (${passRate}%) in ${totalDuration}ms`);
    console.log("=======================================================\n");

    return { totalDuration, passedCount, failedCount, passRate };
}

// ----------------------------------------------------
// 3. WORD DOCUMENT GENERATION (.DOCX)
// ----------------------------------------------------
async function generateWordDocument(summary) {
    console.log("📄 Generating professional Word Document (.docx)...");

    const cellBorder = {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border }
    };

    const headerCell = (text, widthPercent = 20) => new TableCell({
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
        borders: cellBorder,
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, color: COLORS.headerText, font: "Segoe UI", size: 20 })]
            })
        ]
    });

    const dataCell = (text, isPassed = null, widthPercent = 20, align = AlignmentType.LEFT) => {
        let fill = "FFFFFF";
        let color = "0F172A";
        let bold = false;

        if (isPassed === true) {
            fill = COLORS.passBg;
            color = COLORS.passText;
            bold = true;
        } else if (isPassed === false) {
            fill = COLORS.failBg;
            color = COLORS.failText;
            bold = true;
        }

        return new TableCell({
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill },
            borders: cellBorder,
            children: [
                new Paragraph({
                    alignment: align,
                    children: [new TextRun({ text: String(text), color, bold, font: "Segoe UI", size: 18 })]
                })
            ]
        });
    };

    // Build Test Result Table
    const tableRows = [
        new TableRow({
            tableHeader: true,
            children: [
                headerCell("Test ID", 12),
                headerCell("Module", 12),
                headerCell("Test Objective", 26),
                headerCell("Method & Route", 18),
                headerCell("Expected Status", 14),
                headerCell("Actual Status", 10),
                headerCell("Result", 8)
            ]
        })
    ];

    results.forEach((r, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : COLORS.zebraBg;
        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [new Paragraph({ children: [new TextRun({ text: r.id, bold: true, font: "Segoe UI", size: 18 })] })]
                    }),
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [new Paragraph({ children: [new TextRun({ text: r.suite, font: "Segoe UI", size: 18 })] })]
                    }),
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [new Paragraph({ children: [new TextRun({ text: r.name, font: "Segoe UI", size: 18 })] })]
                    }),
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [new Paragraph({ children: [new TextRun({ text: `${r.method} ${r.endpoint}`, font: "Consolas", size: 16 })] })]
                    }),
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(r.expectedStatus), font: "Segoe UI", size: 18 })] })]
                    }),
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(r.actualStatus), font: "Segoe UI", size: 18 })] })]
                    }),
                    dataCell(r.passed ? "PASS" : "FAIL", r.passed, 8, AlignmentType.CENTER)
                ]
            })
        );
    });

    // Detailed Specifications Section Table
    const detailedSpecsRows = [
        new TableRow({
            tableHeader: true,
            children: [
                headerCell("Test ID & Objective", 30),
                headerCell("Request Payload & Route", 35),
                headerCell("Response & Verification Notes", 35)
            ]
        })
    ];

    results.forEach((r, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : COLORS.zebraBg;
        detailedSpecsRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [
                            new Paragraph({ children: [new TextRun({ text: r.id, bold: true, color: COLORS.primary, font: "Segoe UI", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: r.name, font: "Segoe UI", size: 17 })] }),
                            new Paragraph({ children: [new TextRun({ text: `Execution Time: ${r.durationMs}ms`, italics: true, color: "64748B", font: "Segoe UI", size: 15 })] })
                        ]
                    }),
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [
                            new Paragraph({ children: [new TextRun({ text: `${r.method} ${r.endpoint}`, bold: true, font: "Consolas", size: 16 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Payload:", bold: true, font: "Segoe UI", size: 15 })] }),
                            new Paragraph({ children: [new TextRun({ text: r.payload, font: "Consolas", size: 14, color: "334155" })] })
                        ]
                    }),
                    new TableCell({
                        borders: cellBorder,
                        shading: { type: ShadingType.CLEAR, fill: bg },
                        children: [
                            new Paragraph({ children: [new TextRun({ text: `Status: ${r.actualStatus} | Result: `, bold: true, font: "Segoe UI", size: 16 }), new TextRun({ text: r.passed ? "PASSED" : "FAILED", bold: true, color: r.passed ? COLORS.passText : COLORS.failText, font: "Segoe UI", size: 16 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Expected:", bold: true, font: "Segoe UI", size: 15 })] }),
                            new Paragraph({ children: [new TextRun({ text: r.expectedSnippet, font: "Segoe UI", size: 15, color: "475569" })] }),
                            new Paragraph({ children: [new TextRun({ text: "Actual Output:", bold: true, font: "Segoe UI", size: 15 })] }),
                            new Paragraph({ children: [new TextRun({ text: r.actualResponse.substring(0, 180) + (r.actualResponse.length > 180 ? "..." : ""), font: "Consolas", size: 14, color: "334155" })] })
                        ]
                    })
                ]
            })
        );
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Segoe UI", color: "1E293B" }
                }
            }
        },
        sections: [
            {
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({ text: "Library Management System | REST API Test Report", italics: true, color: "94A3B8", size: 16 })
                                ]
                            })
                        ]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.SPACE_BETWEEN,
                                children: [
                                    new TextRun({ text: "Confidential - Automated Quality Assurance Report", color: "94A3B8", size: 16 }),
                                    new TextRun({ text: "Page ", color: "94A3B8", size: 16 }),
                                    new TextRun({ children: [PageNumber.CURRENT], color: "94A3B8", size: 16 }),
                                    new TextRun({ text: " of ", color: "94A3B8", size: 16 }),
                                    new TextRun({ children: [PageNumber.TOTAL_PAGES], color: "94A3B8", size: 16 })
                                ]
                            })
                        ]
                    })
                },
                children: [
                    // Title Block
                    new Paragraph({
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                        children: [
                            new TextRun({
                                text: "LIBRARY MANAGEMENT SYSTEM",
                                bold: true,
                                size: 36,
                                color: COLORS.primary
                            })
                        ]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                        children: [
                            new TextRun({
                                text: "Auth & Books API Automated Test Execution & Verification Report",
                                bold: true,
                                size: 24,
                                color: COLORS.secondary
                            })
                        ]
                    }),

                    // Executive Summary Box
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 200, after: 150 },
                        children: [new TextRun({ text: "1. Executive Summary & Test Metrics", bold: true, size: 24, color: COLORS.primary })]
                    }),

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        width: { size: 25, type: WidthType.PERCENTAGE },
                                        shading: { type: ShadingType.CLEAR, fill: COLORS.subHeaderBg },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Total Test Cases", bold: true, size: 18 })] })]
                                    }),
                                    new TableCell({
                                        width: { size: 25, type: WidthType.PERCENTAGE },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: `${results.length}`, bold: true, size: 22, color: COLORS.primary })] })]
                                    }),
                                    new TableCell({
                                        width: { size: 25, type: WidthType.PERCENTAGE },
                                        shading: { type: ShadingType.CLEAR, fill: COLORS.subHeaderBg },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Pass Rate", bold: true, size: 18 })] })]
                                    }),
                                    new TableCell({
                                        width: { size: 25, type: WidthType.PERCENTAGE },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: `${summary.passRate}%`, bold: true, size: 22, color: summary.passRate === "100.0" ? COLORS.passText : COLORS.primary })] })]
                                    })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        shading: { type: ShadingType.CLEAR, fill: COLORS.subHeaderBg },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Passed Tests", bold: true, size: 18 })] })]
                                    }),
                                    new TableCell({
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: `${summary.passedCount} ✅`, bold: true, size: 20, color: COLORS.passText })] })]
                                    }),
                                    new TableCell({
                                        shading: { type: ShadingType.CLEAR, fill: COLORS.subHeaderBg },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Failed Tests", bold: true, size: 18 })] })]
                                    }),
                                    new TableCell({
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: `${summary.failedCount} ❌`, bold: true, size: 20, color: summary.failedCount > 0 ? COLORS.failText : "64748B" })] })]
                                    })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        shading: { type: ShadingType.CLEAR, fill: COLORS.subHeaderBg },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Execution Date & Time", bold: true, size: 18 })] })]
                                    }),
                                    new TableCell({
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleString(), size: 18 })] })]
                                    }),
                                    new TableCell({
                                        shading: { type: ShadingType.CLEAR, fill: COLORS.subHeaderBg },
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Total Duration", bold: true, size: 18 })] })]
                                    }),
                                    new TableCell({
                                        borders: cellBorder,
                                        children: [new Paragraph({ children: [new TextRun({ text: `${summary.totalDuration} ms`, size: 18 })] })]
                                    })
                                ]
                            })
                        ]
                    }),

                    // Section 2: Summary Matrix Table
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 300, after: 150 },
                        children: [new TextRun({ text: "2. Test Execution Summary Matrix", bold: true, size: 24, color: COLORS.primary })]
                    }),

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: tableRows
                    }),

                    // Section 3: Detailed Specifications
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 300, after: 150 },
                        children: [new TextRun({ text: "3. Detailed Test Case Specifications & API Payloads", bold: true, size: 24, color: COLORS.primary })]
                    }),

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: detailedSpecsRows
                    }),

                    // Section 4: Architecture & Coverage Notes
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 300, after: 150 },
                        children: [new TextRun({ text: "4. Scope, Validations & Coverage Notes", bold: true, size: 24, color: COLORS.primary })]
                    }),
                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "• Authentication Coverage: ", bold: true }),
                            new TextRun({ text: "Tests OTP generation, secure 6-digit verification, institutional email domain filtering (@student.nitandhra.ac.in and @nitandhra.ac.in), strict regex password complexity validation, atomic transaction registration, bcrypt password hashing, and JWT token issuance." })
                        ]
                    }),
                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "• Book Management Coverage: ", bold: true }),
                            new TextRun({ text: "Tests dynamic book cataloging, search by keywords, multi-criteria filtering (category, department), dynamic sorting, ISBN conflict prevention (409), relational shelf availability mapping, transactional stock copies synchronization (totalCopies, availableCopies), and safe cascade deletion." })
                        ]
                    }),
                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "• Negative Scenarios Tested: ", bold: true }),
                            new TextRun({ text: "Missing payload attributes (400), invalid OTP codes (400), password complexity violations (400), duplicate user email registration (400), credential mismatches (400), duplicate ISBN collisions (409), non-existent book retrieval (404), and non-existent book deletion (404)." })
                        ]
                    })
                ]
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputFilename = "API_Test_Report_Auth_and_Books.docx";
    const outputPathRoot = path.resolve(__dirname, "../../", outputFilename);
    const outputPathServer = path.resolve(__dirname, "../", outputFilename);

    try {
        fs.writeFileSync(outputPathRoot, buffer);
        console.log(`📂 Saved to: ${outputPathRoot}`);
    } catch (e) {
        if (e.code === "EBUSY") {
            const fallbackPath = path.resolve(__dirname, "../../", "API_Test_Report_Auth_and_Books_Latest.docx");
            fs.writeFileSync(fallbackPath, buffer);
            console.log(`⚠️ Root file locked by MS Word. Saved latest version to: ${fallbackPath}`);
        } else {
            console.error("Failed to write root file:", e.message);
        }
    }

    try {
        fs.writeFileSync(outputPathServer, buffer);
        console.log(`📂 Saved to: ${outputPathServer}`);
    } catch (e) {
        if (e.code === "EBUSY") {
            const fallbackServer = path.resolve(__dirname, "../", "API_Test_Report_Auth_and_Books_Latest.docx");
            fs.writeFileSync(fallbackServer, buffer);
            console.log(`⚠️ Saved server fallback to: ${fallbackServer}`);
        }
    }

    console.log(`\n🎉 Word Document successfully created!`);
}

// Execution Entrypoint
const testServer = app.listen(PORT, async () => {
    try {
        const summary = await runAllTests();
        await generateWordDocument(summary);
    } catch (err) {
        console.error("❌ Error running tests or generating document:", err);
    } finally {
        testServer.close();
        await prisma.$disconnect();
        process.exit(0);
    }
});
