import { useState } from "react";
import "../styles/RegistrationPage.css";

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
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loadingState, setLoadingState] = useState({
        sendingOtp: false,
        verifyingOtp: false,
        submitting: false,
    });

    const activeForm = formData[selectedRole];
    const details = roleContent[selectedRole];

    const handleRoleChange = (role) => {
        setSelectedRole(role);
        setOtp("");
        setOtpSent(false);
        setOtpVerified(false);
        setSubmitted(false);
        setMessage("");
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
            setOtp("");
            setOtpSent(false);
            setOtpVerified(false);
            setSubmitted(false);
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
        const { name, identifier, email, password } = activeForm;

        if (!name || !identifier || !email || !password) {
            setMessage("Fill in all fields before sending the OTP.");
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
                setSubmitted(false);
                setMessage(result.message);
                return;
            }

            setOtpSent(true);
            setOtpVerified(false);
            setSubmitted(false);
            setMessage(result.message);
        } catch {
            setMessage("Unable to connect to the server. Please try again.");
        } finally {
            setLoadingState((prev) => ({ ...prev, sendingOtp: false }));
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpSent) {
            setMessage("Send the OTP first.");
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
                setMessage(result.message);
                return;
            }

            setOtpVerified(true);
            setMessage(result.message);
        } catch {
            setOtpVerified(false);
            setMessage("Unable to connect to the server. Please try again.");
        } finally {
            setLoadingState((prev) => ({ ...prev, verifyingOtp: false }));
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!otpVerified) {
            setMessage("Verify your email before submitting.");
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
                setSubmitted(false);
                setMessage(result.message);
                return;
            }

            if (result.data?.token) {
                localStorage.setItem("libraryToken", result.data.token);
            }

            setSubmitted(true);
            setMessage(result.message);
        } catch {
            setSubmitted(false);
            setMessage("Unable to connect to the server. Please try again.");
        } finally {
            setLoadingState((prev) => ({ ...prev, submitting: false }));
        }
    };

    return (
        <section className="registration-shell">
            <div className="registration-hero">
                <span className="eyebrow">Library Access Portal</span>
                <h1>Create your library account</h1>
                <p>
                    Choose your role, complete your details, and verify your email with
                    an OTP before submitting.
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

                    <label className="field-group">
                        <span>Email</span>
                        <input
                            type="email"
                            value={activeForm.email}
                            onChange={(event) => handleInputChange("email", event.target.value)}
                            placeholder="Enter your email"
                        />
                    </label>

                    <label className="field-group">
                        <span>Password</span>
                        <input
                            type="password"
                            value={activeForm.password}
                            onChange={(event) => handleInputChange("password", event.target.value)}
                            placeholder="Create a password"
                        />
                    </label>

                    <div className="otp-actions">
                        <button type="button" className="secondary-button" onClick={handleSendOtp}>
                            {loadingState.sendingOtp ? "Sending OTP..." : "Send OTP"}
                        </button>
                        <span className={otpVerified ? "status-chip verified" : "status-chip pending"}>
                            {otpVerified ? "Verified" : otpSent ? "Awaiting verification" : "Not verified"}
                        </span>
                    </div>

                    <label className="field-group">
                        <span>OTP</span>
                        <div className="otp-row">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={(event) => setOtp(event.target.value)}
                                placeholder="Enter 6-digit OTP"
                            />
                            <button type="button" className="ghost-button" onClick={handleVerifyOtp}>
                                {loadingState.verifyingOtp ? "Verifying..." : "Verify OTP"}
                            </button>
                        </div>
                    </label>

                    <button type="submit" className="primary-button" disabled={!otpVerified}>
                        {loadingState.submitting ? "Submitting..." : "Submit Registration"}
                    </button>

                    {message ? <p className="form-message">{message}</p> : null}
                    {submitted ? (
                        <p className="success-note">
                            {details.label} account created successfully.
                        </p>
                    ) : null}
                </form>
            </div>
        </section>
    );
}

export default RegistrationPage;
