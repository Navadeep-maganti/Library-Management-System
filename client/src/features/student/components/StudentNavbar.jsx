import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { to: "/student-dashboard", label: "Dashboard", end: true },
  { to: "/student-dashboard/payfine", label: "Pay Fine" },
  { to: "/student-dashboard/history", label: "View History" },
  { to: "/student-dashboard/requests", label: "Requests" },
  { to: "/student-dashboard/return", label: "Return" },
];

const StudentNavbar = ({
  user,
  searchTerm,
  onSearchChange,
  searchResults = [],
  requestedBooks = [],
  onRequestBook,
  onLogout,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const navigate = useNavigate();
  const displayName = user?.username || user?.email || "Student";
  const profileInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("libraryToken");
      localStorage.removeItem("libraryUser");
    }
    navigate("/", { replace: true });
  };

  return (
    <header className="student-navbar-shell">
      <nav className="student-action-nav" aria-label="Student sections">
        <NavLink className="student-organization-brand" to="/student-dashboard" aria-label="Central Library home">
          <span className="student-organization-icon" aria-hidden="true">
            <span className="brand-book brand-book-green" />
            <span className="brand-book brand-book-pink" />
            <span className="brand-book brand-book-blue" />
          </span>
          <span className="student-organization-copy">
            <strong>Central Library</strong>
            <small>Central Management Portal</small>
          </span>
        </NavLink>
        <div className="student-nav-links">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `student-action ${isActive ? "active" : ""}`}
              end={item.end}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="student-search-wrap">
          <label className="student-nav-search">
          <span aria-hidden="true">Search</span>
          <input
            value={searchTerm}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => {
              navigate("/student-dashboard");
              setIsSearchOpen(true);
            }}
            placeholder="Search books"
          />
          </label>
          {isSearchOpen && (
            <>
              <button className="student-search-backdrop" type="button" aria-label="Close search results" onClick={() => setIsSearchOpen(false)} />
              <div className="student-search-board">
                <div className="student-search-board-header">
                  <div>
                    <span className="student-kicker">LIBRARY CATALOG</span>
                    <strong>{searchTerm ? `Results for “${searchTerm}”` : "Browse all books"}</strong>
                  </div>
                  <button type="button" aria-label="Close search results" onClick={() => setIsSearchOpen(false)}>×</button>
                </div>
                {searchResults.length ? searchResults.map((book) => {
                  const isRequested = requestedBooks.some((request) => request.book.title === book.title && request.status === "Requested");
                  return (
                    <article className="student-search-result" key={book.title}>
                      <div className="student-search-result-cover">{book.title.charAt(0)}</div>
                      <div className="student-search-result-copy">
                        <strong>{book.title}</strong>
                        <span>{book.author} · {book.category}</span>
                      </div>
                      <div className="student-search-actions">
                        <button
                          className="student-search-details"
                          type="button"
                          onClick={() => setSelectedBook((current) => current?.id === book.id ? null : book)}
                        >
                          View details
                        </button>
                        <button className="student-search-request" type="button" disabled={isRequested} onClick={() => onRequestBook(book)}>
                          {isRequested ? "Requested" : "Request book"}
                        </button>
                      </div>
                    </article>
                  );
                }) : <p className="student-search-empty">No books match your search.</p>}
              </div>
              {selectedBook && (
                <div className="book-details-dialog" role="dialog" aria-modal="true" aria-label={`${selectedBook.title} details`}>
                  <div className="book-details-dialog-header">
                    <div>
                      <span className="student-kicker">BOOK RECORD</span>
                      <h2>{selectedBook.title}</h2>
                    </div>
                    <button type="button" aria-label="Close book details" onClick={() => setSelectedBook(null)}>×</button>
                  </div>
                  <p className="book-details-author">By {selectedBook.author}</p>
                  <div className="book-details-grid">
                    <div><span>Book ID</span><strong>{selectedBook.id}</strong></div>
                    <div><span>Available copies</span><strong>{selectedBook.availableCopies}</strong></div>
                    <div><span>Category</span><strong>{selectedBook.category}</strong></div>
                    <div><span>Department</span><strong>{selectedBook.department}</strong></div>
                    <div><span>Shelf no.</span><strong>{selectedBook.location.shelfNo}</strong></div>
                    <div><span>Rack no.</span><strong>{selectedBook.location.rackNo}</strong></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <NavLink className="student-notification-link" aria-label="Notifications" title="Notifications" to="/student-dashboard/alerts">
          <span aria-hidden="true">🔔</span>
        </NavLink>
        <div className="student-profile-menu-wrap">
          <button
            className={`student-profile-link ${isProfileOpen ? "active" : ""}`}
            type="button"
            aria-expanded={isProfileOpen}
            aria-label="Open profile menu"
            onClick={() => setIsProfileOpen((current) => !current)}
          >
          <span className="student-profile-avatar">{profileInitial}</span>
          </button>
          {isProfileOpen && (
            <div className="student-profile-popover">
              <div className="student-profile-popover-heading">
                <span className="student-profile-popover-label">ACCOUNT</span>
                <span className="student-profile-name">{displayName}</span>
              </div>
              <div className="student-profile-popover-rows">
                <div><span>Name</span><strong>{displayName}</strong></div>
                <div><span>Roll</span><strong>{user?.roll_no || user?.rollNo || "Not available"}</strong></div>
                <div><span>Role</span><strong>Student</strong></div>
                <NavLink className="student-change-password" to="/student-dashboard/profile" onClick={() => setIsProfileOpen(false)}>
                  <span>Change password</span><strong>→</strong>
                </NavLink>
              </div>
              <button className="student-logout-btn" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default StudentNavbar;
