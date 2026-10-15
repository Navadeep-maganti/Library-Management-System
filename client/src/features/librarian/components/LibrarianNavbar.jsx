import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/LibrarianNavbar.css";

const LibrarianNavbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);

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

  useEffect(() => {
    const closeProfileMenu = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeProfileMenu);
    return () => document.removeEventListener("mousedown", closeProfileMenu);
  }, []);

  return (
    <header className="librarian-app-header">
      <div className="librarian-navbar-container">
        <Link to="/librarian-dashboard" className="librarian-brand-logo">
          <div className="librarian-brand-icon-box">📚</div>
          <div className="librarian-brand-text">
            <span className="librarian-brand-title">Central Library</span>
            <span className="librarian-brand-subtitle">Librarian Operations Portal</span>
          </div>
        </Link>

        <nav className="librarian-nav-links">
          <Link
            to="/librarian/reservations"
            className={`librarian-nav-link ${isActive("/librarian/reservations") ? "active" : ""}`}
          >
             Reservations
          </Link>
          <Link
            to="/librarian/verify-token"
            className={`librarian-nav-link ${isActive("/librarian/verify-token") ? "active" : ""}`}
          >
            Verify Token
          </Link>
          <Link
            to="/librarian/issue-book"
            className={`librarian-nav-link ${isActive("/librarian/issue-book") ? "active" : ""}`}
          >
            Issued Books
          </Link>
          <Link
            to="/librarian/update-stock"
            className={`librarian-nav-link ${isActive("/librarian/update-stock") ? "active" : ""}`}
          >
            Update Stock
          </Link>
          <span className="librarian-nav-link librarian-nav-link-disabled" aria-disabled="true" title="Fines management is coming soon">
            Fines
          </span>

        </nav>
        <div className="librarian-profile-menu" ref={profileMenuRef}>
          <button
            type="button"
            className="librarian-profile-trigger"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
          >
            <div className="librarian-avatar-icon">
              {user?.username ? user.username.charAt(0).toUpperCase() : "L"}
            </div>
            <span className="librarian-profile-trigger-name">
              {user?.username || user?.email?.split("@")[0] || "Librarian"}
            </span>
            <span className="librarian-profile-caret">▾</span>
          </button>
          {profileOpen && (
            <div className="librarian-profile-dropdown" role="menu">
              <div className="librarian-profile-name">
                <div style={{ fontWeight: 800 }}>{user?.username || "Librarian"}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>
                  {user?.email || "staff@nitandhra.ac.in"}
                </div>
                <div className="librarian-role-tag" style={{ marginTop: "4px" }}>
                  Librarian Staff
                </div>
              </div>
              <button type="button" className="librarian-profile-action librarian-profile-logout" role="menuitem" onClick={handleLogoutClick}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default LibrarianNavbar;
