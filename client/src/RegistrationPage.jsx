import { useEffect, useState } from "react";
import "../styles/RegistrationPage.css";

const OTP_VALIDITY_MINUTES = 10;
const OTP_VALIDITY_MS = OTP_VALIDITY_MINUTES * 60 * 1000;
const OTP_RESEND_LOCK_MS = 60 * 1000;
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

const roleContent = {
    student: {
        label: "Student",
        idLabel: "Roll Number",
        idPlaceholder: "Enter your roll number",
        helper: "Use your academic email and verify it before completing registration.",
    },
    librarian: {
        label: "Librarian",
        idLabel: "Librarian ID",
        idPlaceholder: "Enter your librarian ID",
        helper: "Use your staff email and verify it before requesting account access.",
    },
};

function RegistrationPage() {
    const [selectedRole, setSelectedRole] = useState("student");
    const [formData, setFormData] = useState({
        student: { name: "", identifier: "", email: "", password: "" },
        librarian: { name: "", identifier: "", email: "", password: "" },
    });
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpExpiresAt, setOtpExpiresAt] = useState(null);
    const [otpResendAvailableAt, setOtpResendAvailableAt] = useState(null);
    const [timeLeftMs, setTimeLeftMs] = useState(0);
    const [resendTimeLeftMs, setResendTimeLeftMs] = useState(0);
    const [toast, setToast] = useState(null);
    const [loadingState, setLoadingState] = useState({
        sendingOtp: false,
        verifyingOtp: false,
        submitting: false,
    });

    const activeForm = formData[selectedRole];
    const details = roleContent[selectedRole];

    useEffect(() => {
        if (!otpExpiresAt) {
            setTimeLeftMs(0);
            return undefined;
        }

        const updateTimeLeft = () => {
            setTimeLeftMs(Math.max(otpExpiresAt - Date.now(), 0));
        };

        updateTimeLeft();
        const intervalId = setInterval(updateTimeLeft, 1000);
        return () => clearInterval(intervalId);
    }, [otpExpiresAt]);

    useEffect(() => {
        if (!otpResendAvailableAt) {
            setResendTimeLeftMs(0);
            return undefined;
        }

        const updateResendTimeLeft = () => {
            setResendTimeLeftMs(Math.max(otpResendAvailableAt - Date.now(), 0));
        };

        updateResendTimeLeft();
        const intervalId = setInterval(updateResendTimeLeft, 1000);
        return () => clearInterval(intervalId);
    }, [otpResendAvailableAt]);

    useEffect(() => {
        if (!toast) {
            return undefined;
        }

        const timeoutId = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(timeoutId);
    }, [toast]);

    const formatTimeLeft = (milliseconds) => {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
    };

    const showToast = (type, text) => {
        setToast({ type, text });
    };

    const isPasswordValid = PASSWORD_RULE.test(activeForm.password);

    const resetOtpState = () => {
        setOtp("");
        setOtpSent(false);
        setOtpVerified(false);
        setOtpExpiresAt(null);
        setOtpResendAvailableAt(null);
    };

    const handleRoleChange = (role) => {
        setSelectedRole(role);
        resetOtpState();
        setToast(null);
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [selectedRole]: {
                ...prev[selectedRole],
                [field]: value,
            },
        }));

        if (field === "email") {
            resetOtpState();
        }
    };

    const readResponse = async (response, fallbackMessage) => {
        try {
            const data = await response.json();
            return {
                ok: response.ok,
                data,
                message: data?.message || fallbackMessage,
            };
        } catch {
            return {
                ok: response.ok,
                data: null,
                message: fallbackMessage,
            };
        }
    };

    const handleSendOtp = async () => {
        const { name, identifier, email } = activeForm;

        if (!name || !identifier || !email) {
            showToast("error", "Fill in name, ID, and email before sending the OTP.");
            return;
        }

        if (otpResendAvailableAt && otpResendAvailableAt > Date.now()) {
            showToast("info", `Please wait ${formatTimeLeft(resendTimeLeftMs)} before sending OTP again.`);
            return;
        }

        setLoadingState((prev) => ({ ...prev, sendingOtp: true }));

        try {
            const response = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    role: selectedRole,
                }),
            });

            const result = await readResponse(response, "Failed to send OTP. Please try again.");

            if (!result.ok) {
                setOtpSent(false);
                setOtpVerified(false);
                showToast("error", result.message);
                return;
            }

            setOtpSent(true);
            setOtpVerified(false);
            setOtpExpiresAt(Date.now() + OTP_VALIDITY_MS);
            setOtpResendAvailableAt(Date.now() + OTP_RESEND_LOCK_MS);
            showToast("success", result.message);
        } catch {
            showToast("error", "Unable to connect to the server. Please try again.");
        } finally {
            setLoadingState((prev) => ({ ...prev, sendingOtp: false }));
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpSent) {
            showToast("info", "Send the OTP first.");
            return;
        }

        setLoadingState((prev) => ({ ...prev, verifyingOtp: true }));

        try {
            const response = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: activeForm.email,
                    otp,
                }),
            });

            const result = await readResponse(response, "Failed to verify OTP. Please try again.");

            if (!result.ok) {
                setOtpVerified(false);
                showToast("error", result.message);
                return;
            }

            setOtpVerified(true);
            showToast("success", result.message);
        } catch {
            setOtpVerified(false);
            showToast("error", "Unable to connect to the server. Please try again.");
        } finally {
            setLoadingState((prev) => ({ ...prev, verifyingOtp: false }));
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!otpVerified) {
            showToast("info", "Verify your email before submitting.");
            return;
        }

        if (!isPasswordValid) {
            showToast("error", "Password must be at least 8 characters and include 1 uppercase letter and 1 special character.");
            return;
        }

        setLoadingState((prev) => ({ ...prev, submitting: true }));

        try {
            const payload = {
                email: activeForm.email,
                username: activeForm.name.trim(),
                password: activeForm.password,
                role: selectedRole,
            };

            if (selectedRole === "student") {
                payload.roll_no = activeForm.identifier;
            } else {
                payload.staff_id = activeForm.identifier;
            }

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await readResponse(response, "Registration failed. Please try again.");

            if (!result.ok) {
                showToast("error", result.message);
                return;
            }

            if (result.data?.token) {
                localStorage.setItem("libraryToken", result.data.token);
            }

            showToast("success", result.message);
        } catch {
            showToast("error", "Unable to connect to the server. Please try again.");
        } finally {
            setLoadingState((prev) => ({ ...prev, submitting: false }));
        }
    };

    return (
        <section className="registration-shell">
            {toast ? (
                <div className={`toast-message ${toast.type}`} role="status" aria-live="polite">
                    {toast.text}
                </div>
            ) : null}

            <div className="registration-hero">
                <span className="eyebrow">Create Account</span>
                <h1>Create your library Account</h1>
                <p>
                    Choose your role, complete your details, and verify your email with as OTP before submitting.
                </p>
            </div>

            <div className="registration-card">
                <div className="role-toggle" role="tablist" aria-label="Registration roles">
                    {Object.entries(roleContent).map(([role, content]) => (
                        <button
                            key={role}
                            type="button"
                            className={selectedRole === role ? "role-pill active" : "role-pill"}
                            onClick={() => handleRoleChange(role)}
                        >
                            {content.label}
                        </button>
                    ))}
                </div>

                <form className="registration-form" onSubmit={handleSubmit}>
                    <div className="form-intro">
                        <h2>{details.label} Registration</h2>
                        <p>{details.helper}</p>
                    </div>

                    <div className="form-grid-two">
                        <label className="field-group">
                            <span>Name</span>
                            <input
                                type="text"
                                value={activeForm.name}
                                onChange={(event) => handleInputChange("name", event.target.value)}
                                placeholder="Enter your full name"
                            />
                        </label>

                        <label className="field-group">
                            <span>{details.idLabel}</span>
                            <input
                                type="text"
                                value={activeForm.identifier}
                                onChange={(event) => handleInputChange("identifier", event.target.value)}
                                placeholder={details.idPlaceholder}
                            />
                        </label>
                    </div>

                    <div className="verification-block">
                        <label className="field-group">
                            <span>Email</span>
                            <div className="inline-control-row">
                                <input
                                    type="email"
                                    value={activeForm.email}
                                    onChange={(event) => handleInputChange("email", event.target.value)}
                                    placeholder="Enter your email"
                                />
                            <button
                                type="button"
                                className="secondary-button inline-button"
                                onClick={handleSendOtp}
                                disabled={loadingState.sendingOtp || resendTimeLeftMs > 0}
                            >
                                {loadingState.sendingOtp
                                    ? "Sending..."
                                    : otpSent && resendTimeLeftMs === 0
                                      ? "Resend OTP"
                                      : "Send OTP"}
                            </button>
                            </div>
                        </label>

                        {otpSent ? (
                            <p className="otp-feedback-note">
                                OTP valid for {formatTimeLeft(timeLeftMs)}
                                {resendTimeLeftMs > 0 ? ` | resend in ${formatTimeLeft(resendTimeLeftMs)}` : ""}
                            </p>
                        ) : null}

                        <label className="field-group">
                            <span>OTP</span>
                            <div className="inline-control-row otp-row-balanced">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(event) => setOtp(event.target.value)}
                                    placeholder="Enter OTP"
                                />
                                <button
                                    type="button"
                                    className="ghost-button inline-button"
                                    onClick={handleVerifyOtp}
                                >
                                    {loadingState.verifyingOtp ? "Verifying..." : "Verify OTP"}
                                </button>
                            </div>
                        </label>
                    </div>

                    <label className="field-group">
                        <span>Password</span>
                        <div className="password-stack">
                            <input
                                type="password"
                                value={activeForm.password}
                                onChange={(event) => handleInputChange("password", event.target.value)}
                                placeholder="Create password"
                                className={activeForm.password && !isPasswordValid ? "input-invalid" : ""}
                            />
                            <p className="field-helper">
                                Minimum 8 characters. Use at least 1 uppercase letter and 1 special character.
                            </p>
                        </div>
                    </label>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={!otpVerified || !isPasswordValid}
                    >
                        {loadingState.submitting ? "Submitting..." : "Submit Registration"}
                    </button>

                    <p className="auth-switch-note">
                        I am already a user. <a href="/register">Sign in</a>
                    </p>
                </form>
            </div>
        </section>
    );
}

export default RegistrationPage;
