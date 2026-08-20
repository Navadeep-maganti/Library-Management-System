import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("libraryToken");
      localStorage.removeItem("libraryUser");
    }
    navigate("/", { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const dashboardPath = user?.role === "librarian" ? "/librarian-dashboard" : "/student-dashboard";

  return (
    <header className="app-header">
      <div className="navbar-container">
        <Link to="/" className="brand-logo">
          <div className="brand-icon-box">📚</div>
          <div className="brand-text">
            <span className="brand-title">Central Library</span>
            <span className="brand-subtitle">Central Management Portal</span>
          </div>
        </Link>

        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${isActive("/") ? "active" : ""}`}
          >
            Home
          </Link>

          {user ? (
            <>
              <Link
                to={dashboardPath}
                className={`nav-link ${isActive(dashboardPath) ? "active" : ""}`}
              >
                Dashboard
              </Link>
              <div className="user-badge-group">
                <div className="user-chip">
                  <div className="user-avatar">
                    {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="user-name">{user.username || user.email}</span>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="logout-btn"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-button-outline">
                Sign In
              </Link>
              <Link to="/register" className="nav-button-primary">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
