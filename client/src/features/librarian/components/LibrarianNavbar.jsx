import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import "../styles/LibrarianNavbar.css";

const LibrarianNavbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user.username || user.email?.split("@")[0] || "Librarian";
  const profileInitial = displayName.charAt(0).toUpperCase();

  const handleLogoutClick = () => {
    onLogout?.();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const navigationLinks = [
    { to: "/librarian-dashboard", label: "Dashboard", icon: "⌂" },
    { to: "/librarian/reservations", label: "Reservations", icon: "▤" },
    { to: "/librarian/verify-token", label: "Verify Token", icon: "" },
    { to: "/librarian/issue-book", label: "Issued Books", icon: "▣" },
    { to: "/librarian/update-stock", label: "Update Stock", icon: "↻" },
    { to: "/librarian/fines", label: "Fines", icon: "₹" },
  ];

  return (
    <header className="librarian-app-header">
      <div className="librarian-navbar-container">
        <button type="button" className="librarian-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open librarian navigation" aria-expanded={sidebarOpen}></button>
        <Link to="/librarian-dashboard" className="librarian-brand-logo"><div className="librarian-brand-icon-box" aria-hidden="true">📚</div><div className="librarian-brand-text"><span className="librarian-brand-title">Central Library</span><span className="librarian-brand-subtitle">Librarian Operations Portal</span></div></Link>
        <nav className="librarian-nav-links">
          {navigationLinks.slice(1, 6).map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => `librarian-nav-link ${isActive ? "active" : ""}`}>{label}</NavLink>)}
        </nav>
        <div className="librarian-navbar-actions">
          <NavLink to="/librarian/alerts" className={({ isActive }) => `librarian-alert-link ${isActive ? "active" : ""}`} aria-label="Alerts" title="Alerts"><span aria-hidden="true">🔔</span></NavLink>
          <div className="librarian-profile-menu">
            <button type="button" className={`librarian-profile-trigger ${profileOpen ? "active" : ""}`} onClick={() => setProfileOpen((current) => !current)} aria-expanded={profileOpen} aria-label="Open profile menu"><span className="librarian-avatar-icon">{profileInitial}</span><span className="librarian-profile-trigger-name">{displayName}</span><span className="librarian-profile-caret">▾</span></button>
            {profileOpen && <><button type="button" className="librarian-profile-drawer-backdrop" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} /><aside className="librarian-profile-drawer" role="dialog" aria-modal="true" aria-labelledby="librarian-drawer-name"><button type="button" className="librarian-profile-drawer-close" onClick={() => setProfileOpen(false)} aria-label="Close profile menu">×</button><div className="librarian-profile-drawer-avatar">{profileInitial}</div><strong id="librarian-drawer-name">{displayName}</strong>{user.email && <span>{user.email}</span>}<small>Librarian Staff{user.staff_id ? ` · ${user.staff_id}` : ""}</small><nav className="librarian-profile-drawer-links"><Link to="/librarian/profile" onClick={() => setProfileOpen(false)}>Profile &amp; Settings</Link><Link to="/librarian/alerts" onClick={() => setProfileOpen(false)}><span aria-hidden="true">🔔</span> Alerts</Link></nav><button type="button" className="librarian-drawer-logout" onClick={handleLogoutClick}>Logout</button></aside></>}
          </div>
        </div>
      </div>
      <div className={`librarian-sidebar-backdrop ${sidebarOpen ? "is-open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`librarian-mobile-sidebar ${sidebarOpen ? "is-open" : ""}`} aria-label="Librarian navigation">
        <div className="librarian-sidebar-top"><strong>{displayName}</strong><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">×</button></div>
        <nav className="librarian-sidebar-nav">{navigationLinks.map(({ to, label, icon }) => <Link key={to} to={to} className={location.pathname === to ? "active" : ""}><span>{icon}</span>{label}</Link>)}<Link to="/librarian/alerts"><span aria-hidden="true">🔔</span>Alerts</Link><Link to="/librarian/profile"><span>◉</span>Profile &amp; Settings</Link></nav>
        <button type="button" className="librarian-sidebar-logout" onClick={handleLogoutClick}>Log out</button>
      </aside>
    </header>
  );
};

export default LibrarianNavbar;
