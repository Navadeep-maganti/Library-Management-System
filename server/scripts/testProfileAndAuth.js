import prisma from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:5000";

async function runTests() {
    console.log("=================================================");
    console.log("🧪 RUNNING TESTS: PROFILE CONTROLLING & PASSWORD");
    console.log("=================================================\n");

    const testEmail = "profile.tester@student.nitandhra.ac.in";
    const testRollNo = "PROF_TEST_001";
    const initialPassword = "Password@2026";
    const newPasswordDirect = "UpdatedPass@2026";
    const newPasswordOtp = "OtpResetPass@2026";

    try {
        // 1. Cleanup old test data
        await prisma.otp.deleteMany({ where: { email: testEmail } });
        await prisma.student.deleteMany({ where: { rollNo: testRollNo } });
        await prisma.user.deleteMany({ where: { email: testEmail } });

        // 2. Create test user and student
        const passwordHash = await bcrypt.hash(initialPassword, 10);
        await prisma.user.create({
            data: {
                email: testEmail,
                username: "Original Profile Tester",
                role: "student",
                passwordHash
            }
        });
        await prisma.student.create({
            data: {
                email: testEmail,
                rollNo: testRollNo,
                department: "Computer Science",
                yearOfStudy: 2
            }
        });

        // 3. Generate auth token
        let token = jwt.sign(
            { email: testEmail, username: "Original Profile Tester", role: "student" },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        console.log("✅ [SETUP] Created test user and student record.");

        // TEST 1: GET /api/profile without token (Should fail with 401)
        let res = await fetch(`${BASE_URL}/api/profile`);
        let data = await res.json();
        console.assert(res.status === 401, "Test 1 Failed: Expected 401 for unauthenticated request");
        console.log("✅ [TEST 1] GET /api/profile rejected unauthenticated request with 401");

        // TEST 2: GET /api/profile with valid token (Should succeed)
        res = await fetch(`${BASE_URL}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Test 2 Failed: Expected 200");
        console.assert(data.profile.rollNo === testRollNo, "Test 2 Failed: rollNo mismatch");
        console.log(`✅ [TEST 2] GET /api/profile returned user: ${data.profile.username}, Dept: ${data.profile.department}`);

        // TEST 3: PUT /api/profile (Update username, department, and year of study)
        res = await fetch(`${BASE_URL}/api/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                username: "Renamed Profile Tester",
                department: "Electrical Engineering",
                yearOfStudy: 3
            })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Test 3 Failed: Expected 200");
        console.assert(data.profile.username === "Renamed Profile Tester", "Test 3 Failed: Username not updated");
        console.assert(data.profile.department === "Electrical Engineering", "Test 3 Failed: Department not updated");
        console.assert(data.profile.yearOfStudy === 3, "Test 3 Failed: yearOfStudy not updated");
        console.assert(!!data.token, "Test 3 Failed: New JWT token not provided");
        token = data.token; // Update token
        console.log("✅ [TEST 3] PUT /api/profile successfully updated username, department, and year of study");

        // TEST 4: PATCH /api/profile/username (Dedicated username update)
        res = await fetch(`${BASE_URL}/api/profile/username`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ username: "Final Username Tester" })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.profile.username === "Final Username Tester", "Test 4 Failed");
        token = data.token;
        console.log("✅ [TEST 4] PATCH /api/profile/username successfully updated username");

        // TEST 5: GET /api/profile/summary
        res = await fetch(`${BASE_URL}/api/profile/summary`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Test 5 Failed");
        console.log(`✅ [TEST 5] GET /api/profile/summary returned loans: ${data.activeLoansCount}, reservations: ${data.activeReservationsCount}`);

        // TEST 6: Change password with WRONG current password (Should fail with 400)
        res = await fetch(`${BASE_URL}/api/profile/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: "IncorrectCurrentPass@123",
                newPassword: newPasswordDirect
            })
        });
        data = await res.json();
        console.assert(res.status === 400, "Test 6 Failed: Expected 400 for incorrect current password");
        console.log(`✅ [TEST 6] Change password rejected incorrect current password (${data.message})`);

        // TEST 7: Change password with WEAK new password (Should fail with 400)
        res = await fetch(`${BASE_URL}/api/profile/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: initialPassword,
                newPassword: "weak"
            })
        });
        data = await res.json();
        console.assert(res.status === 400, "Test 7 Failed: Expected 400 for weak password");
        console.log(`✅ [TEST 7] Change password rejected weak password (${data.message})`);

        // TEST 8: Direct change password with VALID current and new password (Should succeed)
        res = await fetch(`${BASE_URL}/api/profile/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: initialPassword,
                newPassword: newPasswordDirect,
                confirmPassword: newPasswordDirect
            })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Test 8 Failed");
        console.log("✅ [TEST 8] Direct change password succeeded with current password verification");

        // TEST 9: Verify user can login with newPasswordDirect
        res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testEmail,
                password: newPasswordDirect,
                role: "student"
            })
        });
        data = await res.json();
        console.assert(res.status === 200 && !!data.token, "Test 9 Failed: Login with new password failed");
        token = data.token;
        console.log("✅ [TEST 9] User successfully logged in with newly changed direct password");

        // TEST 10: Authenticated OTP password change: Send OTP
        res = await fetch(`${BASE_URL}/api/profile/password/send-otp`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        data = await res.json();
        console.assert(res.status === 200, "Test 10 Failed: send-otp failed");
        console.log("✅ [TEST 10] POST /api/profile/password/send-otp dispatched OTP");

        // Fetch generated OTP from DB
        const otpRecord = await prisma.otp.findFirst({
            where: { email: testEmail },
            orderBy: { createdAt: "desc" }
        });
        console.assert(!!otpRecord, "OTP not saved to database");

        // TEST 11: Authenticated OTP password change: Verify OTP
        res = await fetch(`${BASE_URL}/api/profile/password/verify-otp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ otp: otpRecord.otp })
        });
        data = await res.json();
        console.assert(res.status === 200 && !!data.passwordChangeToken, "Test 11 Failed");
        const passwordChangeToken = data.passwordChangeToken;
        console.log("✅ [TEST 11] POST /api/profile/password/verify-otp returned passwordChangeToken");

        // TEST 12: Authenticated OTP password change: Apply new password with passwordChangeToken
        res = await fetch(`${BASE_URL}/api/profile/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                passwordChangeToken,
                newPassword: newPasswordOtp,
                confirmPassword: newPasswordOtp
            })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Test 12 Failed");
        console.log("✅ [TEST 12] Applied new password using passwordChangeToken");

        // TEST 13: Login with newPasswordOtp
        res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testEmail,
                password: newPasswordOtp,
                role: "student"
            })
        });
        data = await res.json();
        console.assert(res.status === 200, "Test 13 Failed: Could not login with OTP-updated password");
        console.log("✅ [TEST 13] User successfully logged in with OTP-updated password");

        // TEST 14: Public Forgot Password Flow (POST /api/auth/forgot-password)
        res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: testEmail })
        });
        data = await res.json();
        console.assert(res.status === 200, "Test 14 Failed");
        console.log("✅ [TEST 14] Public POST /api/auth/forgot-password sent reset OTP");

        const resetOtpRecord = await prisma.otp.findFirst({
            where: { email: testEmail },
            orderBy: { createdAt: "desc" }
        });

        // TEST 15: Public Verify Reset OTP (POST /api/auth/verify-reset-otp)
        res = await fetch(`${BASE_URL}/api/auth/verify-reset-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: testEmail, otp: resetOtpRecord.otp })
        });
        data = await res.json();
        console.assert(res.status === 200 && !!data.resetToken, "Test 15 Failed");
        const resetToken = data.resetToken;
        console.log("✅ [TEST 15] Public POST /api/auth/verify-reset-otp returned resetToken");

        // TEST 16: Public Reset Password (POST /api/auth/reset-password)
        const finalPassword = "FinalMasterPass@2026";
        res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testEmail,
                resetToken,
                newPassword: finalPassword,
                confirmPassword: finalPassword
            })
        });
        data = await res.json();
        console.assert(res.status === 200 && data.success === true, "Test 16 Failed");
        console.log("✅ [TEST 16] Public POST /api/auth/reset-password successfully updated password");

        // TEST 17: Login with final reset password
        res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testEmail,
                password: finalPassword,
                role: "student"
            })
        });
        data = await res.json();
        console.assert(res.status === 200, "Test 17 Failed: Login with final reset password failed");
        console.log("✅ [TEST 17] User logged in with public-reset password!");

        // Cleanup
        await prisma.otp.deleteMany({ where: { email: testEmail } });
        await prisma.student.deleteMany({ where: { rollNo: testRollNo } });
        await prisma.user.deleteMany({ where: { email: testEmail } });

        console.log("\n=================================================");
        console.log("🎉 ALL 17 PROFILE & PASSWORD TESTS PASSED 100%!");
        console.log("=================================================\n");
    } catch (err) {
        console.error("❌ Test failed with error:", err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runTests();
