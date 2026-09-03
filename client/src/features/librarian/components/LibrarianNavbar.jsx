import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/LibrarianNavbar.css";

const LibrarianNavbar = ({ user, onLogout }) => {
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

    return (
        <header className="librarian-app-header">
            <div className="librarian-navbar-container">
                <Link to="/librarian-dashboard" className="librarian-brand-logo">
                    <div className="librarian-brand-text">
                        <span className="librarian-brand-title">Central Library</span>
                        <span className="librarian-brand-subtitle">Librarian Operations Portal</span>
                    </div>
                </Link>

                <nav className="librarian-nav-links">
                    <Link
                        to="/librarian/requests"
                        className={`librarian-nav-link ${isActive("/librarian/requests") ? "active" : ""}`}
                    >
                        📋 View Requests
                    </Link>
                    <Link
                        to="/librarian/verify-token"
                        className={`librarian-nav-link ${isActive("/librarian/verify-token") ? "active" : ""}`}
                    >
                        🔑 Verify Token
                    </Link>
                    <Link
                        to="/librarian/issue-book"
                        className={`librarian-nav-link ${isActive("/librarian/issue-book") ? "active" : ""}`}
                    >
                        📖 Issue Book
                    </Link>
                    <Link
                        to="/librarian/update-stock"
                        className={`librarian-nav-link ${isActive("/librarian/update-stock") ? "active" : ""}`}
                    >
                        📦 Update Stock
                    </Link>

                    <div className="librarian-user-group">
                        <div className="librarian-chip">
                            <div className="librarian-avatar">
                                {user?.username ? user.username.charAt(0).toUpperCase() : "L"}
                            </div>
                            <div className="librarian-details">
                                <span className="librarian-name">{user?.username || user?.email || "Librarian Staff"}</span>
                                <span className="librarian-role-tag">Staff Admin</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogoutClick}
                            className="librarian-logout-btn"
                        >
                            Sign Out
                        </button>
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default LibrarianNavbar;