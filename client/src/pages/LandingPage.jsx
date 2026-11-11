import React from "react";
import { Link } from "react-router-dom";
import "../styles/LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          Central Library • Management System
        </div>
        <h1 className="hero-title">
          Empowering Learning through <span className="hero-gradient-text">Smart Library Access</span>
        </h1>
        <p className="hero-subtitle">
          Seamlessly manage book loans, verify academic credentials via domain OTP, and explore digital & physical catalog resources for students and librarians.
        </p>

        <div className="cta-group">
          <Link to="/register" className="primary-cta">
            Register Account &rarr;
          </Link>
          <Link to="/login" className="secondary-cta">
            Sign In to Portal
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3 className="stat-value">Live Catalog</h3>
            <p className="stat-label">Books, availability & inventory</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-value">OTP + JWT</h3>
            <p className="stat-label">Email verification and sessions</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-value">Targeted Alerts</h3>
            <p className="stat-label">Department, year and demand updates</p>
          </div>
        </div>
      </section>

      {/* Role Access Section */}
      <section className="roles-section">
        <div className="section-header">
          <h2 className="section-title">Tailored Access Portals</h2>
          <p className="section-subtitle">
            Registration and login are automatically configured based on your official email address.
          </p>
        </div>

        <div className="cards-grid">
          {/* Student Card */}
          <div className="role-card">
            <h3 className="card-title">Student Portal</h3>
            <p className="card-text">
              Requires your student academic email (e.g. <code>rollno@student.nitandhra.ac.in</code>) and verified OTP. Access borrowing history and catalog reservation.
            </p>
            <div className="domain-tag">@student.nitandhra.ac.in</div>
            <Link to="/register" className="card-button">
              Register as Student
            </Link>
          </div>

          {/* Librarian Card */}
          <div className="role-card">
            <h3 className="card-title">Librarian Portal</h3>
            <p className="card-text">
              Requires official staff email or personal email (e.g. <code>staff@nitandhra.ac.in</code> or Gmail), staff ID, and OTP verification. Manage library records and book checkout logs.
            </p>
            <div className="domain-tag librarian">
              @nitandhra.ac.in / Gmail
            </div>
            <Link to="/register" className="card-button">
              Register as Librarian
            </Link>
          </div>
        </div>
      </section>

      {/* Security & Features Banner */}
      <section className="features-section">
        <div className="feature-box">
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">✓</span>
            <div>
              <h4 className="feature-title">Email Domain Security</h4>
              <p className="feature-desc">Only authorized domain emails can complete registration.</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">✦</span>
            <div>
              <h4 className="feature-title">Instant OTP Dispatch</h4>
              <p className="feature-desc">Receive 6-digit verification codes valid for 10 minutes directly in your inbox.</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">◈</span>
            <div>
              <h4 className="feature-title">JWT Authenticated Sessions</h4>
              <p className="feature-desc">Secure 24-hour token based authentication for smooth operations.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
