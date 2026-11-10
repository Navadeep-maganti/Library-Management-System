import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../../../api";
import "../styles/LoginPage.css";

const LoginPage = ({ onAuthSuccess }) => {
  const STUDENT_EMAIL_SUFFIX = "@student.nitandhra.ac.in";
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const showToast = (type, text) => setToast({ type, text });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast(null);

    if (!email.trim() || !password.trim()) {
      showToast("error", role === "student"
        ? "Student roll number and password are required."
        : "Email address and password are required.");
      return;
    }

    const cleanIdentifier = email.trim().toLowerCase();
    const cleanEmail = role === "student"
      ? `${cleanIdentifier}${STUDENT_EMAIL_SUFFIX}`
      : cleanIdentifier;

    if (role === "student" && !cleanIdentifier) {
      showToast("error", "Enter your student roll number.");
      return;
    }

    if (role === "librarian" && cleanEmail.endsWith(STUDENT_EMAIL_SUFFIX)) {
      showToast("error", "Librarian login requires official staff or personal email (e.g. Gmail)");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please verify your credentials.");
      }

      showToast("success", data.message || "Login successful! Redirecting...");

      if (data.token) {
        localStorage.setItem("libraryToken", data.token);
      }
      if (data.user) {
        localStorage.setItem("libraryUser", JSON.stringify(data.user));
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        }
      }

      const targetPath = data.user.role === "librarian" ? "/librarian-dashboard" : "/student-dashboard";

      setTimeout(() => {
        navigate(targetPath);
      }, 1000);
    } catch (err) {
      showToast("error", err.message || "Something went wrong while logging in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmailPlaceholder = () => {
    if (role === "student") return "e.g., 421101@student.nitandhra.ac.in";
    return "e.g., staff@nitandhra.ac.in or librarian@gmail.com";
  };

  const getEmailHint = () => {
    if (role === "student") return "Must end with @student.nitandhra.ac.in";
    return "Official email or Gmail";
  };

  const getForgotEmail = () => {
    const identifier = forgotEmail.trim().toLowerCase();
    return role === "student" && !identifier.includes("@")
      ? `${identifier}${STUDENT_EMAIL_SUFFIX}`
      : identifier;
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setForgotStep("request");
    setForgotOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setToast(null);
    setIsForgotOpen(true);
  };

  const handleForgotRequest = async (event) => {
    event.preventDefault();
    const cleanEmail = getForgotEmail();
    if (!cleanEmail || (role === "student" && !/^\d+@student\.nitandhra\.ac\.in$/.test(cleanEmail)) || (role === "librarian" && !cleanEmail.includes("@"))) {
      showToast("error", role === "student" ? "Enter your student roll number." : "Enter a valid account email address.");
      return;
    }

    setForgotSubmitting(true);
    setToast(null);
    try {
      const response = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not send the reset OTP.");
      setForgotEmail(cleanEmail);
      setForgotStep("verify");
      showToast("success", "A 6-digit OTP was sent to your registered email. It expires in 10 minutes.");
    } catch (requestError) {
      showToast("error", requestError.message);
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleForgotVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(forgotOtp.trim())) {
      showToast("error", "Enter the 6-digit OTP from your email.");
      return;
    }

    setForgotSubmitting(true);
    setToast(null);
    try {
      const response = await apiFetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Invalid or expired OTP.");
      setResetToken(data.resetToken);
      setForgotStep("reset");
      showToast("success", "OTP verified. Choose a new password.");
    } catch (verifyError) {
      showToast("error", verifyError.message);
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("error", "New password and confirmation do not match.");
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword)) {
      showToast("error", "Password must be at least 8 characters and include 1 uppercase letter and 1 special character.");
      return;
    }

    setForgotSubmitting(true);
    setToast(null);
    try {
      const response = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, resetToken, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not reset your password.");
      setIsForgotOpen(false);
      setPassword("");
      showToast("success", "Password reset successfully. Sign in with your new password.");
    } catch (resetError) {
      showToast("error", resetError.message);
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="login-page-shell">
      {toast ? (
        <div className={`login-toast ${toast.type}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      ) : null}

      <div className="login-card">
        <div className="login-card-header">
          <p className="login-card-tag">CENTRAL LIBRARY MANAGEMENT SYSTEM</p>
          <h2 className="login-title">Sign in to your account</h2>
          <p className="login-subtitle">Select your role and enter your official credentials.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            {/* Role Selection Toggle */}
            <div className="login-toggle-group">
              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setEmail("");
                  setToast(null);
                }}
                className={role === "student" ? "login-toggle-button active" : "login-toggle-button"}
              >
                Student Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("librarian");
                  setEmail("");
                  setToast(null);
                }}
                className={role === "librarian" ? "login-toggle-button active" : "login-toggle-button"}
              >
                Librarian Sign In
              </button>
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-label">
              {role === "student" ? "Student Roll Number" : `Official Email (${getEmailHint()})`}
            </label>
            {role === "student" ? (
              <div className="student-email-input">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  placeholder="e.g., 421101"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
                  className="login-input"
                  aria-label="Student roll number"
                  required
                />
              </div>
            ) : (
              <input
                type="email"
                placeholder={getEmailPlaceholder()}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                required
              />
            )}
          </div>

          <div className="login-input-group">
            <div className="login-label-row">
              <label className="login-label">Password</label>
              <button type="button" className="forgot-password-link" onClick={openForgotPassword}>
                Forgot password?
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
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
          </div>

          <button
            type="submit"
            className="login-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Authenticating..." : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>

        <div className="login-footer">
          <span>New to Central Library? </span>
          <Link to="/register" className="login-register-link">
            Create an Account &rarr;
          </Link>
        </div>
      </div>

      {isForgotOpen && (
        <div className="forgot-password-backdrop" onClick={() => setIsForgotOpen(false)} role="presentation">
          <section className="forgot-password-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
            <div className="forgot-password-heading">
              <div>
                <p className="login-card-tag">ACCOUNT RECOVERY</p>
                <h2 id="forgot-password-title">Reset your password</h2>
              </div>
              <button type="button" className="forgot-password-close" onClick={() => setIsForgotOpen(false)} aria-label="Close password recovery">×</button>
            </div>
            <p className="forgot-password-progress">Step {forgotStep === "request" ? "1" : forgotStep === "verify" ? "2" : "3"} of 3</p>
            {forgotStep === "request" && (
              <form className="forgot-password-form" onSubmit={handleForgotRequest}>
                <p>Enter the account identifier associated with your library account. We will email you a one-time verification code.</p>
                <label className="login-label">{role === "student" ? "Student Roll Number" : "Account Email"}</label>
                <input className="login-input" type={role === "student" ? "text" : "email"} inputMode={role === "student" ? "numeric" : "email"} value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value.replace(/\s/g, ""))} placeholder={role === "student" ? "e.g., 424151" : "you@example.com"} autoFocus required />
                <button className="login-submit-button" type="submit" disabled={forgotSubmitting}>{forgotSubmitting ? "Sending OTP..." : "Send Reset OTP"}</button>
              </form>
            )}

            {forgotStep === "verify" && (
              <form className="forgot-password-form" onSubmit={handleForgotVerify}>
                <p>Enter the 6-digit code sent to <strong>{forgotEmail}</strong>.</p>
                <label className="login-label" htmlFor="reset-otp">Verification OTP</label>
                <input id="reset-otp" className="login-input forgot-otp-input" type="text" inputMode="numeric" maxLength={6} value={forgotOtp} onChange={(event) => setForgotOtp(event.target.value.replace(/\D/g, ""))} autoFocus required />
                <button className="login-submit-button" type="submit" disabled={forgotSubmitting}>{forgotSubmitting ? "Verifying..." : "Verify OTP"}</button>
                <button className="forgot-secondary-button" type="button" onClick={handleForgotRequest} disabled={forgotSubmitting}>Resend OTP</button>
              </form>
            )}

            {forgotStep === "reset" && (
              <form className="forgot-password-form" onSubmit={handlePasswordReset}>
                <p>Set a new password for <strong>{forgotEmail}</strong>.</p>
                <label className="login-label" htmlFor="new-password">New Password</label>
                <input id="new-password" className="login-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoFocus required />
                <label className="login-label" htmlFor="confirm-new-password">Confirm New Password</label>
                <input id="confirm-new-password" className="login-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                <small className="forgot-password-hint">At least 8 characters, including one uppercase letter and one special character.</small>
                <button className="login-submit-button" type="submit" disabled={forgotSubmitting}>{forgotSubmitting ? "Updating Password..." : "Set New Password"}</button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
