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
        student: { identifier: "", email: "", password: "" },
        librarian: { identifier: "", email: "", password: "" },
    });
    const [otp, setOtp] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const activeForm = formData[selectedRole];
    const details = roleContent[selectedRole];

    const handleRoleChange = (role) => {
        setSelectedRole(role);
        setOtp("");
        setGeneratedOtp("");
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
            setGeneratedOtp("");
            setOtpSent(false);
            setOtpVerified(false);
            setSubmitted(false);
        }
    };

    const handleSendOtp = () => {
        const { identifier, email, password } = activeForm;

        if (!identifier || !email || !password) {
            setMessage("Fill in all fields before sending the OTP.");
            return;
        }

        const nextOtp = String(Math.floor(100000 + Math.random() * 900000));
        setGeneratedOtp(nextOtp);
        setOtpSent(true);
        setOtpVerified(false);
        setSubmitted(false);
        setMessage(`OTP sent to ${email}. Demo OTP: ${nextOtp}`);
    };

    const handleVerifyOtp = () => {
        if (!otpSent) {
            setMessage("Send the OTP first.");
            return;
        }

        if (otp === generatedOtp) {
            setOtpVerified(true);
            return;
        }

        setOtpVerified(false);
        setMessage("Invalid OTP. Please try again.");
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!otpVerified) {
            setMessage("Verify your email before submitting.");
            return;
        }

        setSubmitted(true);
        setMessage(`${details.label} registration details are ready to be submitted.`);
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
                            Send OTP
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
                                Verify OTP
                            </button>
                        </div>
                    </label>

                    <button type="submit" className="primary-button" disabled={!otpVerified}>
                        Submit Registration
                    </button>

                    {message ? <p className="form-message">{message}</p> : null}
                    {submitted ? (
                        <p className="success-note">
                            Frontend flow complete for {details.label.toLowerCase()} registration.
                        </p>
                    ) : null}
                </form>
            </div>
        </section>
    );
}

export default RegistrationPage;
