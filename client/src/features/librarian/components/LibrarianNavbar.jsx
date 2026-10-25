import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/LibrarianNavbar.css";

const LibrarianNavbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    document.body.classList.toggle("librarian-sidebar-open", sidebarOpen);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("librarian-sidebar-open");
    };
  }, [sidebarOpen]);

  const navigationLinks = [
    { to: "/librarian-dashboard", label: "Dashboard", icon: "⌂" },
    { to: "/librarian/reservations", label: "Reservations", icon: "▤" },
    { to: "/librarian/verify-token", label: "Verify Token", icon: "✓" },
    { to: "/librarian/issue-book?tab=issue", label: "Issue Book", icon: "▣" },
    { to: "/librarian/update-stock", label: "Update Stock", icon: "↻" },
  ];

  return (
    <header className="librarian-app-header">
      <div className="librarian-navbar-container">
        <button
          type="button"
          className="librarian-menu-toggle"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open librarian navigation"
          aria-expanded={sidebarOpen}
          aria-controls="librarian-mobile-sidebar"
        >
          {user?.username ? user.username.charAt(0).toUpperCase() : "L"}
        </button>
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
            to="/librarian/issue-book?tab=issue"
            className={`librarian-nav-link ${isActive("/librarian/issue-book") ? "active" : ""}`}
          >
            Issue Book
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
      <div
        className={`librarian-sidebar-backdrop ${sidebarOpen ? "is-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="librarian-mobile-sidebar"
        className={`librarian-mobile-sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="Librarian navigation"
        aria-hidden={!sidebarOpen}
        inert={sidebarOpen ? undefined : ""}
      >
        <div className="librarian-sidebar-top">
          <div className="librarian-sidebar-profile">
            <div className="librarian-sidebar-avatar">
              {user?.username ? user.username.charAt(0).toUpperCase() : "L"}
            </div>
            <div>
              <strong>{user?.username || user?.email?.split("@")[0] || "Librarian"}</strong>
              <span>Librarian Staff</span>
            </div>
          </div>
          <button type="button" className="librarian-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">×</button>
        </div>
        <nav className="librarian-sidebar-nav">
          <span className="librarian-sidebar-label">LIBRARY OPERATIONS</span>
          {navigationLinks.map(({ to, label, icon }) => (
            <Link key={to} to={to} className={`librarian-sidebar-link ${isActive(to.split("?")[0]) ? "active" : ""}`}>
              <span className="librarian-sidebar-link-icon" aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
          <span className="librarian-sidebar-link is-disabled"><span className="librarian-sidebar-link-icon" aria-hidden="true">₹</span>Fines <small>Coming soon</small></span>
        </nav>
        <button type="button" className="librarian-sidebar-logout" onClick={handleLogoutClick}>Log out</button>
      </aside>
    </header>
  );
};

export default LibrarianNavbar;
