import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/RegistrationPage.css";

const OTP_VALIDITY_MINUTES = 10;
const OTP_VALIDITY_MS = OTP_VALIDITY_MINUTES * 60 * 1000;
const OTP_RESEND_LOCK_MS = 60 * 1000;
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

const roleContent = {
  student: {
    label: "Student",
    idLabel: "Roll Number",
    idPlaceholder: "e.g., 421101",
    emailPlaceholder: "e.g., rollno@student.nitandhra.ac.in",
    domainHint: "Must end with @student.nitandhra.ac.in",
    helper: "Use your official student email address to receive the verification OTP.",
  },
  librarian: {
    label: "Librarian",
    idLabel: "Staff / Faculty ID",
    idPlaceholder: "e.g., LIB-2024-01",
    emailPlaceholder: "e.g., staffname@nitandhra.ac.in or name@gmail.com",
    domainHint: "Official email or Gmail",
    helper: "Use your official staff or personal email address to receive the verification OTP.",
  },
};

function RegistrationPage({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("student");

  const [formData, setFormData] = useState({
    student: {
      name: "",
      identifier: "",
      email: "",
      password: "",
    },
    librarian: {
      name: "",
      identifier: "",
      email: "",
      password: "",
    },
  });

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [resendTimeLeftMs, setResendTimeLeftMs] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
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

    const timeoutId = setTimeout(() => setToast(null), 4000);
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
      showToast("error", "Fill in full name, ID, and email before requesting OTP.");
      return;
    }

    if (selectedRole === "student" && !email.toLowerCase().endsWith("@student.nitandhra.ac.in")) {
      showToast("error", "Student email must end with @student.nitandhra.ac.in");
      return;
    }

    if (selectedRole === "librarian" && email.toLowerCase().endsWith("@student.nitandhra.ac.in")) {
      showToast("error", "Librarian registration requires official staff or personal email (not @student.nitandhra.ac.in)");
      return;
    }

    if (otpResendAvailableAt && otpResendAvailableAt > Date.now()) {
      showToast("info", `Please wait ${formatTimeLeft(resendTimeLeftMs)} before requesting OTP again.`);
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
          email: email.trim().toLowerCase(),
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
      showToast("info", "Request the OTP first.");
      return;
    }

    if (!otp.trim()) {
      showToast("error", "Please enter the 6-digit OTP code.");
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
          email: activeForm.email.trim().toLowerCase(),
          otp: otp.trim(),
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
      showToast("info", "Please verify your email via OTP before submitting.");
      return;
    }

    if (!isPasswordValid) {
      showToast("error", "Password must be at least 8 characters with 1 uppercase letter & 1 special character.");
      return;
    }

    setLoadingState((prev) => ({ ...prev, submitting: true }));

    try {
      const payload = {
        email: activeForm.email.trim().toLowerCase(),
        username: activeForm.name.trim(),
        password: activeForm.password,
        role: selectedRole,
      };

      if (selectedRole === "student") {
        payload.roll_no = activeForm.identifier.trim();
      } else {
        payload.staff_id = activeForm.identifier.trim();
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
      if (result.data?.user) {
        localStorage.setItem("libraryUser", JSON.stringify(result.data.user));
      }

      showToast("success", result.message || "Registration successful!");

      if (onAuthSuccess) {
        onAuthSuccess(result.data.user);
      }

      const targetPath = selectedRole === "librarian" ? "/librarian-dashboard" : "/student-dashboard";

      setTimeout(() => {
        navigate(targetPath);
      }, 1200);
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
        <span className="eyebrow">NIT AP LIBRARY</span>
        <h1>Create your Library Account</h1>
        <p>
          Select your academic role, complete your details, verify your email with OTP, and access your library profile.
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
              {content.label} Registration
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
              <span>Full Name *</span>
              <input
                type="text"
                value={activeForm.name}
                onChange={(event) => handleInputChange("name", event.target.value)}
                placeholder="Enter your full name"
                required
              />
            </label>

            <label className="field-group">
              <span>{details.idLabel} *</span>
              <input
                type="text"
                value={activeForm.identifier}
                onChange={(event) => handleInputChange("identifier", event.target.value)}
                placeholder={details.idPlaceholder}
                required
              />
            </label>
          </div>

          <div className="verification-block">
            <label className="field-group">
              <span>Official Email ({details.domainHint}) *</span>
              <div className="inline-control-row">
                <input
                  type="email"
                  value={activeForm.email}
                  onChange={(event) => handleInputChange("email", event.target.value)}
                  placeholder={details.emailPlaceholder}
                  required
                />
                <button
                  type="button"
                  className="secondary-button inline-button"
                  onClick={handleSendOtp}
                  disabled={loadingState.sendingOtp || resendTimeLeftMs > 0 || otpVerified}
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
                {resendTimeLeftMs > 0 ? ` | Resend locked for ${formatTimeLeft(resendTimeLeftMs)}` : ""}
              </p>
            ) : null}

            <label className="field-group">
              <span>OTP Code *</span>
              <div className="inline-control-row otp-row-balanced">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter 6-digit OTP"
                  disabled={otpVerified}
                />
                <button
                  type="button"
                  className="ghost-button inline-button"
                  onClick={handleVerifyOtp}
                  disabled={loadingState.verifyingOtp || otpVerified || !otpSent}
                  style={otpVerified ? { background: "#dcfce7", color: "#166534" } : {}}
                >
                  {loadingState.verifyingOtp
                    ? "Verifying..."
                    : otpVerified
                    ? "✓ Verified"
                    : "Verify OTP"}
                </button>
              </div>
            </label>
          </div>

          <label className="field-group">
            <span>Password *</span>
            <div className="password-stack">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={activeForm.password}
                  onChange={(event) => handleInputChange("password", event.target.value)}
                  placeholder="Create strong password"
                  className={activeForm.password && !isPasswordValid ? "input-invalid password-input-field" : "password-input-field"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <p className="field-helper" style={activeForm.password && !isPasswordValid ? { color: "#b91c1c" } : {}}>
                Requirements: Minimum 8 characters, at least 1 uppercase letter (A-Z) and 1 special character (!@#$%^&*).
              </p>
            </div>
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={!otpVerified || !isPasswordValid || loadingState.submitting}
          >
            {loadingState.submitting ? "Submitting Registration..." : "Complete Registration"}
          </button>

          <p className="auth-switch-note">
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default RegistrationPage;
