import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/student-dashboard", label: "Home", mobileLabel: "Home", icon: "home", end: true },
  { to: "/student-dashboard/books", label: "Browse Books", mobileLabel: "Browse", icon: "books" },
  { to: "/student-dashboard/requests", label: "Requests", mobileLabel: "Requests", icon: "requests" },
  { to: "/student-dashboard/payfine", label: "Pay Fine", mobileLabel: "Fine", icon: "fine" },
  { to: "/student-dashboard/history", label: "View History", mobileLabel: "History", icon: "history" },
];

const NavIcon = ({ name }) => {
  const shared = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.8 };
  const paths = {
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    books: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20M8 7h8M8 10h7" /></>,
    requests: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="m3 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2" /></>,
    fine: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /><path d="M16 14v3m-1.5-1.5h3" /></>,
    history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}>{paths[name]}</svg>;
};

const StudentNavbar = ({
  user,
  searchTerm,
  onSearchChange,
  searchResults = [],
  requestedBooks = [],
  onRequestBook,
  requestingBookId,
  onLogout,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const navigate = useNavigate();
  const displayName = user?.username || user?.email || "Student";
  const profileInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isProfileOpen) return undefined;

    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = "hidden";

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsProfileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (isMobile) document.body.style.overflow = previousOverflow;
    };
  }, [isProfileOpen]);

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
            📚
          </span>
          <span className="student-organization-copy">
            <strong>Central Library</strong>
            <small>Student Portal</small>
          </span>
        </NavLink>
        <div className="student-nav-links">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `student-action student-bottom-action student-action-${item.icon} ${isActive ? "active" : ""}`}
              end={item.end}
              key={item.to}
              to={item.to}
            >
              <NavIcon name={item.icon} />
              <span className="student-nav-label-desktop">{item.label}</span>
              <span className="student-nav-label-mobile">{item.mobileLabel}</span>
            </NavLink>
          ))}
        </div>
        <div className="student-search-wrap">
          <label className="student-nav-search">
          <span aria-hidden="true"></span>
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
          <label>🔍</label>
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
                  const isRequested = requestedBooks.some((request) => request.book?.id === book.id && ["Requested", "Booked", "Reserved"].includes(request.status));
                  return (
                    <article className="student-search-result" key={book.title}>
                      <div className="student-search-result-cover">{book.title.charAt(0)}</div>
                      <div className="student-search-result-copy">
                        <strong>{book.title}</strong>
                        <span>{book.author} · {book.category?.name || book.category || "Uncategorized"}</span>
                      </div>
                      <div className="student-search-actions">
                        <button
                          className="student-search-details"
                          type="button"
                          onClick={() => setSelectedBook((current) => current?.id === book.id ? null : book)}
                        >
                          View details
                        </button>
                        <button className="student-search-request" type="button" disabled={isRequested || requestingBookId === book.id} onClick={() => onRequestBook(book)}>
                          {requestingBookId === book.id ? "Requesting..." : isRequested ? "Requested" : "Request book"}
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
                    <div><span>Category</span><strong>{selectedBook.category?.name || selectedBook.category || "Uncategorized"}</strong></div>
                    <div><span>Department</span><strong>{selectedBook.department?.name || selectedBook.department || "General"}</strong></div>
                    <div><span>Shelf no.</span><strong>{selectedBook.availabilities?.[0]?.shelf?.section || "Not assigned"}</strong></div>
                    <div><span>Rack no.</span><strong>{selectedBook.availabilities?.[0]?.shelf?.rackNumber || "Not assigned"}</strong></div>
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
            <>
              <button
                className="student-profile-drawer-backdrop"
                type="button"
                aria-label="Close profile menu"
                onClick={() => setIsProfileOpen(false)}
              />
              <aside className="student-profile-drawer" role="dialog" aria-modal="true" aria-labelledby="student-drawer-name">
                <div className="student-profile-drawer-header">
                  <button className="student-profile-drawer-close" type="button" aria-label="Close profile menu" onClick={() => setIsProfileOpen(false)} autoFocus>
                    <span aria-hidden="true">×</span>
                  </button>
                  <div className="student-profile-drawer-avatar" aria-hidden="true">{profileInitial}</div>
                  <strong id="student-drawer-name">{displayName}</strong>
                  {user?.email && <span className="student-profile-drawer-email">{user.email}</span>}
                  <span className="student-profile-drawer-meta">
                    {user?.department?.name || user?.department || "Student"}
                    {(user?.roll_no || user?.rollNo) && ` · ${user.roll_no || user.rollNo}`}
                  </span>
                </div>
                <nav className="student-profile-drawer-links" aria-label="Student account navigation">
                  <NavLink to="/student-dashboard/profile" onClick={() => setIsProfileOpen(false)}>
                    <NavIcon name="profile" /><span>Profile &amp; Settings</span>
                  </NavLink>
                  {navItems.map((item) => (
                    <NavLink
                      end={item.end}
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsProfileOpen(false)}
                      className={({ isActive }) => isActive ? "active" : ""}
                    >
                      <NavIcon name={item.icon} /><span>{item.icon === "books" ? "Browse" : item.icon === "fine" ? "Pay Fine" : item.icon === "history" ? "History" : item.label}</span>
                    </NavLink>
                  ))}
                </nav>
                <div className="student-profile-drawer-footer">
                  <button className="student-logout-btn" type="button" onClick={handleLogout}>Logout</button>
                </div>
              </aside>
            </>
          )}
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
