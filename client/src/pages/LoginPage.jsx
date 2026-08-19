import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";

const LoginPage = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.trim() || !password.trim()) {
      setError("Email address and password are required.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (role === "student" && !cleanEmail.endsWith("@student.nitandhra.ac.in")) {
      setError("Student login requires email ending with @student.nitandhra.ac.in");
      return;
    }

    if (role === "librarian" && !cleanEmail.endsWith("@nitandhra.ac.in")) {
      setError("Librarian login requires email ending with @nitandhra.ac.in");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
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

      setSuccessMessage(data.message || "Login successful! Redirecting...");

      if (data.token) {
        localStorage.setItem("libraryToken", data.token);
      }
      if (data.user) {
        localStorage.setItem("libraryUser", JSON.stringify(data.user));
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        }
      }

      const targetPath = data.user?.role === "librarian" ? "/librarian-dashboard" : "/student-dashboard";

      setTimeout(() => {
        navigate(targetPath);
      }, 1000);
    } catch (err) {
      setError(err.message || "Something went wrong while logging in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmailPlaceholder = () => {
    if (role === "student") return "e.g., 421101@student.nitandhra.ac.in";
    return "e.g., staffname@nitandhra.ac.in";
  };

  const getEmailHint = () => {
    if (role === "student") return "Must end with @student.nitandhra.ac.in";
    return "Must end with @nitandhra.ac.in";
  };

  return (
    <div className="login-page-shell">
      <div className="login-card">
        <div className="login-card-header">
          <p className="login-card-tag">NIT AP LIBRARY MANAGEMENT SYSTEM</p>
          <h2 className="login-title">Sign in to your account</h2>
          <p className="login-subtitle">Select your role and enter your official credentials.</p>
        </div>

        {error && <div className="login-error-banner">{error}</div>}
        {successMessage && <div className="login-success-banner">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            {/* Role Selection Toggle */}
            <div className="login-toggle-group">
              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setError("");
                }}
                className={role === "student" ? "login-toggle-button active" : "login-toggle-button"}
              >
                Student Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("librarian");
                  setError("");
                }}
                className={role === "librarian" ? "login-toggle-button active" : "login-toggle-button"}
              >
                Librarian Sign In
              </button>
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-label">
              Official Email ({getEmailHint()})
            </label>
            <input
              type="email"
              placeholder={getEmailPlaceholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
            />
          </div>

          <div className="login-input-group">
            <div className="login-label-row">
              <label className="login-label">Password</label>
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
              >
                {showPassword ? "Hide" : "Show"}
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
          <span>New to NIT AP Library? </span>
          <Link to="/register" className="login-register-link">
            Create an Account &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
