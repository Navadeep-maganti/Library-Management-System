import React, { useMemo, useState } from "react";

import "../styles/StudentDashboard.css";

const booksByDepartment = {
  CSE: [
    { title: "Clean Code", author: "Robert C. Martin", category: "Software Engineering" },
    { title: "Introduction to Algorithms", author: "Thomas H. Cormen", category: "Algorithms" },
    { title: "Operating System Concepts", author: "Abraham Silberschatz", category: "Systems" },
    { title: "Computer Networks", author: "Andrew S. Tanenbaum", category: "Networking" },
  ],
  ECE: [
    { title: "Microelectronic Circuits", author: "Adel S. Sedra", category: "Electronics" },
    { title: "Digital Signal Processing", author: "John G. Proakis", category: "Signal Processing" },
    { title: "Communication Systems", author: "Simon Haykin", category: "Communication" },
    { title: "Digital Design", author: "M. Morris Mano", category: "Digital Electronics" },
  ],
  DEFAULT: [
    { title: "Engineering Mathematics", author: "B. S. Grewal", category: "Mathematics" },
    { title: "The Design of Everyday Things", author: "Don Norman", category: "Design" },
    { title: "Wings of Fire", author: "A. P. J. Abdul Kalam", category: "Biography" },
    { title: "Fundamentals of Physics", author: "David Halliday", category: "Physics" },
  ],
};

const dummyStudentUser = {
  username: "Student",
  department: "General",
};

const dashboardSections = [
  { id: "dashboard", label: "Dashboard", icon: "D" },
  { id: "payfine", label: "Pay Fine", icon: "F" },
  { id: "history", label: "View History", icon: "H" },
  { id: "alerts", label: "Alerts", icon: "A" },
];

const StudentDashboard = ({ user }) => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [requestedBooks, setRequestedBooks] = useState([]);

  const storedUser = (() => {
    try {
      const stored = localStorage.getItem("libraryUser");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();
  const currentUser = { ...dummyStudentUser, ...storedUser, ...user };

  const department = currentUser?.department?.toUpperCase() || "";
  const books = useMemo(() => {
    const departmentBooks = department.includes("CSE") || department.includes("COMPUTER")
      ? booksByDepartment.CSE
      : department.includes("ECE") || department.includes("ELECTRONIC")
        ? booksByDepartment.ECE
        : booksByDepartment.DEFAULT;
    return [...departmentBooks].sort(() => Math.random() - 0.5);
  }, [department]);

  const filteredBooks = books.filter((book) =>
    `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const requestBook = (title) => {
    setRequestedBooks((current) => (current.includes(title) ? current : [...current, title]));
  };

  return (
    <div className="student-dashboard-shell">
      <section className="student-welcome">
        <p className="student-kicker">STUDENT LIBRARY</p>
        <h1>Hi, {currentUser.username || "Student"}</h1>
        <p>Find your next useful read from the {currentUser.department || "General"} collection.</p>
      </section>

      <nav className="student-action-nav" aria-label="Student sections">
        {dashboardSections.map((section) => (
          <button
            className={`student-action ${activeSection === section.id ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSection(section.id)}
            key={section.id}
          >
            <span>{section.icon}</span>
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === "dashboard" && (
        <section className="catalog-section">
          <div className="catalog-heading">
            <div>
              <p className="student-kicker">RECOMMENDED FOR YOU</p>
              <h2>{currentUser.department || "General"} Department Books</h2>
            </div>
            <span className="book-count">{filteredBooks.length} titles</span>
          </div>
          <label className="book-search">
            <span>S</span>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search books, authors, or subjects" />
          </label>

          {filteredBooks.length ? (
            <div className="book-grid">
              {filteredBooks.map((book) => {
                const isRequested = requestedBooks.includes(book.title);
                return (
                  <article className="book-card" key={book.title}>
                    <div className="book-cover">{book.title.charAt(0)}</div>
                    <div className="book-card-content">
                      <span className="book-category">{book.category}</span>
                      <h3>{book.title}</h3>
                      <p>By {book.author}</p>
                      <button className="book-button" type="button" disabled={isRequested} onClick={() => requestBook(book.title)}>
                        {isRequested ? "Requested" : "Book this title"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <p className="empty-search">No books match your search.</p>}
        </section>
      )}

      {activeSection === "payfine" && (
        <section className="student-info-panel">
          <div className="catalog-heading">
            <div>
              <p className="student-kicker">PAYMENTS</p>
              <h2>Fine Status</h2>
            </div>
            <span className="book-count">No dues</span>
          </div>
          <div className="student-empty-state">
            <strong>No pending fines</strong>
            <span>Your account currently has no outstanding library payments.</span>
          </div>
        </section>
      )}

      {activeSection === "history" && (
        <section className="student-info-panel">
          <div className="catalog-heading">
            <div>
              <p className="student-kicker">BORROWING RECORD</p>
              <h2>View History</h2>
            </div>
          </div>
          <div className="history-list">
            <article>
              <strong>Introduction to Algorithms</strong>
              <span>Returned on Aug 12, 2026</span>
            </article>
            <article>
              <strong>Operating System Concepts</strong>
              <span>Issued on Aug 18, 2026</span>
            </article>
          </div>
        </section>
      )}

      {activeSection === "alerts" && (
        <section className="student-info-panel">
          <div className="catalog-heading">
            <div>
              <p className="student-kicker">LIBRARY UPDATES</p>
              <h2>Alerts</h2>
            </div>
          </div>
          <div className="history-list">
            <article>
              <strong>Reading rooms are open during exam week.</strong>
              <span>Use your student ID card for entry after 8 PM.</span>
            </article>
            <article>
              <strong>Return books before the due date.</strong>
              <span>Late returns may add daily fines to your account.</span>
            </article>
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentDashboard;
