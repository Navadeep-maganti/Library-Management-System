import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import StudentNavbar from "../components/StudentNavbar";
import { booksByDepartment, dummyStudentUser } from "../data/studentData";
import "../styles/StudentDashboard.css";

/*
|--------------------------------------------------------------------------
| TEMPORARY DASHBOARD DATA
|--------------------------------------------------------------------------
| This data is only for the UI prototype.
| Later, these values will come from the backend API.
*/

// Dashboard statistics
const dashboardStats = {
  borrowed: 3,
  overdue: 1,
  pendingFine: 50,
  finePaid: 200,
};

// Currently borrowed books
const borrowedBooks = [
  {
    id: 1,
    title: "Clean Code",
    author: "Robert C. Martin",
    copies: 1,
    issueDate: "20 Aug 2026",
    dueDate: "03 Sep 2026",
  },
  {
    id: 2,
    title: "Database System Concepts",
    author: "Abraham Silberschatz",
    copies: 1,
    issueDate: "22 Aug 2026",
    dueDate: "05 Sep 2026",
  },
  {
    id: 3,
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt",
    copies: 1,
    issueDate: "25 Aug 2026",
    dueDate: "08 Sep 2026",
  },
];

const createRequestedToken = () => {
  const uniquePart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `BK-${uniquePart.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
};

const StudentDashboard = ({ user, onLogout }) => {
  /*
  |--------------------------------------------------------------------------
  | EXISTING STUDENT MODULE STATE
  |--------------------------------------------------------------------------
  | These are kept because other student routes may currently depend on them.
  | We can move catalogue-specific logic into its own page later.
  */

  const [searchTerm, setSearchTerm] = useState("");
  const [issuanceNoticeBook, setIssuanceNoticeBook] = useState(null);
  const [requests, setRequests] = useState(() => {
    const now = Date.now();
    const demoBooks = booksByDepartment.DEFAULT;

    return [
      {
        id: "demo-request-1",
        token: "REQ-DEMO7A21F4",
        book: { ...demoBooks[0], copies: 1 },
        bookedOn: new Date(now - 8 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 22 * 60 * 1000).toISOString(),
        status: "Booked",
      },
      {
        id: "demo-request-2",
        token: "REQ-DEMO3C98B2",
        book: { ...demoBooks[1], copies: 2 },
        bookedOn: new Date(now - 19 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 11 * 60 * 1000).toISOString(),
        status: "Booked",
      },
      {
        id: "demo-request-3",
        token: "REQ-DEMO5E64D9",
        book: { ...demoBooks[2], copies: 1 },
        bookedOn: new Date(now - 52 * 60 * 1000).toISOString(),
        expiresAt: new Date(now - 22 * 60 * 1000).toISOString(),
        status: "Failed",
      },
    ];
  });
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("title");

  const location = useLocation();
  const navigate = useNavigate();

  /*
  |--------------------------------------------------------------------------
  | CURRENT USER
  |--------------------------------------------------------------------------
  */

  const storedUser = (() => {
    try {
      const stored = localStorage.getItem("libraryUser");

      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();

  const currentUser = {
    ...dummyStudentUser,
    ...storedUser,
    ...user,
  };

  /*
  |--------------------------------------------------------------------------
  | DEPARTMENT BOOK DATA
  |--------------------------------------------------------------------------
  | Kept for the existing student catalogue routes.
  |--------------------------------------------------------------------------
  */

  const department = currentUser?.department?.toUpperCase() || "";
  const userDepartment = currentUser.department || "General";

  const books = useMemo(() => {
    const departmentBooks =
      department.includes("CSE") ||
      department.includes("COMPUTER")
        ? booksByDepartment.CSE
        : department.includes("ECE") ||
            department.includes("ELECTRONIC")
          ? booksByDepartment.ECE
          : booksByDepartment.DEFAULT;

    return departmentBooks.map((book, index) => ({
      ...book,
      id: `${department || "GEN"}-${String(index + 1).padStart(3, "0")}`,
      availableCopies: 2 + (index % 4),
      department: userDepartment,
      location: {
        shelfNo: `S-${String(index + 1).padStart(2, "0")}`,
        rackNo: `R-${String(index + 3).padStart(2, "0")}`,
      },
    }));
  }, [department, userDepartment]);

  /*
  |--------------------------------------------------------------------------
  | EXISTING BOOK SEARCH / FILTER / SORT
  |--------------------------------------------------------------------------
  */

  const filteredBooks = books.filter((book) =>
    `${book.title} ${book.author} ${book.category}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const categories = [
    "All",
    ...new Set(filteredBooks.map((book) => book.category)),
  ];

  const visibleBooks = useMemo(
    () =>
      filteredBooks
        .filter(
          (book) =>
            category === "All" || book.category === category,
        )
        .sort((firstBook, secondBook) =>
          firstBook[sortBy].localeCompare(secondBook[sortBy]),
        ),
    [category, filteredBooks, sortBy],
  );

  /*
  |--------------------------------------------------------------------------
  | REQUEST BOOK
  |--------------------------------------------------------------------------
  */

  const requestBook = (book) => {
    setRequests((current) => {
      if (current.some((request) => request.book.title === book.title && ["Requested", "Booked"].includes(request.status))) {
        return current;
      }

      const bookedOn = new Date();
      return [
        ...current,
        {
          id: `${book.title}-${bookedOn.getTime()}`,
          token: createRequestedToken(),
          book: { ...book, copies: book.copies || 1 },
          bookedOn: bookedOn.toISOString(),
          expiresAt: new Date(bookedOn.getTime() + 30 * 60 * 1000).toISOString(),
          status: "Requested",
        },
      ];
    });
    setIssuanceNoticeBook(book);
  };

  /*
  |--------------------------------------------------------------------------
  | CHECK WHETHER CURRENT ROUTE IS DASHBOARD HOME
  |--------------------------------------------------------------------------
  */

  const isDashboardHome =
    location.pathname === "/student-dashboard";

  /*
  |--------------------------------------------------------------------------
  | DASHBOARD
  |--------------------------------------------------------------------------
  */

  return (
    <div className="student-dashboard-shell">

      {/* =========================================================
          NAVBAR
      ========================================================== */}

      <StudentNavbar
        user={currentUser}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchResults={filteredBooks}
        requestedBooks={requests}
        onRequestBook={requestBook}
        onLogout={onLogout}
      />

      {issuanceNoticeBook && (
        <>
          <button className="issuance-notice-backdrop" type="button" aria-label="Close issuance notice" onClick={() => setIssuanceNoticeBook(null)} />
          <section className="issuance-notice" role="dialog" aria-modal="true" aria-labelledby="booking-notice-title">
            <div className="issuance-notice-icon" aria-hidden="true">✓</div>
            <div className="issuance-notice-copy">
              <span className="student-kicker">BOOKING CONFIRMED</span>
              <h2 id="booking-notice-title">{issuanceNoticeBook.title} booking confirmed</h2>
              <p>Please collect the issued book from the library within the given time. After the deadline, the request will be treated as failed.</p>
            </div>
            <button className="issuance-notice-close" type="button" onClick={() => setIssuanceNoticeBook(null)}>Got it</button>
          </section>
        </>
      )}


      {/* =========================================================
          DASHBOARD HOME
      ========================================================== */}

      {isDashboardHome ? (
        <main className="student-dashboard-content">

          {/* =====================================================
              WELCOME SECTION
          ====================================================== */}

          <section className="student-welcome">

            <p className="student-kicker">
              STUDENT LIBRARY
            </p>

            <h1>
              Welcome back,{" "}
              {currentUser.username || "Student"} 👋
            </h1>

            <p>
              Here's an overview of your library activity.
            </p>

          </section>


          {/* =====================================================
              OVERDUE ALERT
          ====================================================== */}

          {dashboardStats.overdue > 0 && (
            <section className="dashboard-alert">

              <div className="dashboard-alert-icon">
                !
              </div>

              <div className="dashboard-alert-content">

                <h3>
                  You have {dashboardStats.overdue} overdue book
                  {dashboardStats.overdue > 1 ? "s" : ""}
                </h3>

                <p>
                  Please check your borrowed books and return
                  overdue items to avoid additional fines.
                </p>

              </div>

              <button
                type="button"
                className="dashboard-alert-button"
                onClick={() =>
                  navigate("/student-dashboard/loans")
                }
              >
                View Loans →
              </button>

            </section>
          )}


          {/* =====================================================
              STATISTICS
          ====================================================== */}

          <section className="student-stats">

            {/* -------------------------------------------------
                BORROWED BOOKS
            -------------------------------------------------- */}

            <article className="stat-card">

              <div className="stat-card-top">

                <span className="stat-card-label">
                  BORROWED BOOKS
                </span>

                <span
                  className="stat-card-icon"
                  aria-hidden="true"
                >
                  📚
                </span>

              </div>

              <h2>
                {dashboardStats.borrowed}
              </h2>

              <p>
                Currently borrowed
              </p>

            </article>


            {/* -------------------------------------------------
                OVERDUE BOOKS
            -------------------------------------------------- */}

            <article
              className={`stat-card ${
                dashboardStats.overdue > 0
                  ? "stat-card-warning"
                  : ""
              }`}
            >

              <div className="stat-card-top">

                <span className="stat-card-label">
                  OVERDUE BOOKS
                </span>

                <span
                  className="stat-card-icon"
                  aria-hidden="true"
                >
                  ⚠
                </span>

              </div>

              <h2>
                {dashboardStats.overdue}
              </h2>

              <p>
                Requires attention
              </p>

            </article>


            {/* -------------------------------------------------
                PENDING FINE
            -------------------------------------------------- */}

            <article className="stat-card">

              <div className="stat-card-top">

                <span className="stat-card-label">
                  PENDING FINE
                </span>

                <span
                  className="stat-card-icon"
                  aria-hidden="true"
                >
                  ₹
                </span>

              </div>

              <h2>
                ₹{dashboardStats.pendingFine}
              </h2>

              <p>
                Currently unpaid
              </p>

            </article>


            {/* -------------------------------------------------
                FINE PAID
            -------------------------------------------------- */}

            <article className="stat-card">

              <div className="stat-card-top">

                <span className="stat-card-label">
                  FINE PAID
                </span>

                <span
                  className="stat-card-icon"
                  aria-hidden="true"
                >
                  ✓
                </span>

              </div>

              <h2>
                ₹{dashboardStats.finePaid}
              </h2>

              <p>
                Total paid
              </p>

            </article>

          </section>


          {/* =====================================================
              CURRENTLY BORROWED BOOKS
          ====================================================== */}

          <section className="borrowed-books-section">

            {/* -------------------------------------------------
                SECTION HEADER
            -------------------------------------------------- */}

            <div className="section-heading">

              <div>

                <p className="student-kicker">
                  MY LIBRARY
                </p>

                <h2>
                  Currently Borrowed Books
                </h2>

                <p className="section-description">
                  Books currently issued to your account.
                </p>

              </div>


              <button
                type="button"
                className="view-all-button"
                onClick={() =>
                  navigate("/student-dashboard/loans")
                }
              >
                View All →
              </button>

            </div>


            {/* =================================================
                BOOK LIST
            ================================================== */}

            {borrowedBooks.length > 0 ? (
              <>

                <div className="borrowed-books-table">

                  {/* ------------------------------------------------
                      TABLE HEADER
                  ------------------------------------------------- */}

                  <div className="borrowed-books-header">

                    <span>
                      Title
                    </span>

                    <span>
                      Author
                    </span>

                    <span>
                      No. of Copies
                    </span>

                    <span>
                      Issue Date
                    </span>

                    <span>
                      Due Date
                    </span>

                  </div>


                  {/* ------------------------------------------------
                      BOOK ROWS
                  ------------------------------------------------- */}

                  {borrowedBooks.map((book) => (

                    <div
                      className="borrowed-book-row"
                      key={book.id}
                    >

                      {/* TITLE */}

                      <div className="book-title-cell">

                        <div className="book-thumbnail">
                          {book.title.charAt(0)}
                        </div>

                        <div>

                          <strong>
                            {book.title}
                          </strong>

                        </div>

                      </div>


                      {/* AUTHOR */}

                      <span className="book-author-cell">
                        {book.author}
                      </span>


                      {/* NUMBER OF COPIES */}

                      <span>
                        {book.copies}
                      </span>


                      {/* ISSUE DATE */}

                      <span>
                        {book.issueDate}
                      </span>


                      {/* DUE DATE */}

                      <span className="due-date-cell">
                        {book.dueDate}
                      </span>

                    </div>

                  ))}

                </div>


                {/* =================================================
                    TABLE FOOTER
                ================================================== */}

                <div className="borrowed-books-footer">

                  <span>
                    Showing {borrowedBooks.length} of 9
                    borrowed books
                  </span>

           

                </div>

              </>

            ) : (

              /* =================================================
                 EMPTY STATE
              ================================================== */

              <div className="borrowed-books-empty">

                <div className="empty-state-icon">
                  📚
                </div>

                <h3>
                  No borrowed books
                </h3>

                <p>
                  You currently don't have any books
                  checked out.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/student-dashboard/books")
                  }
                >
                  Browse Books
                </button>

              </div>

            )}

          </section>

          <section className="catalog-section dashboard-catalog">
            <div className="section-heading">
              <div>
                <p className="student-kicker">DISCOVER SOMETHING NEW</p>
                <h2>Browse and book a title</h2>
                <p className="section-description">A request is held for 30 minutes. Claim it before the timer ends.</p>
              </div>
              <div className="catalog-inline-controls">
                <label className="field-with-label">
                  <span>Category</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="field-with-label">
                  <span>Sort by</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="category">Category</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="book-grid">
              {visibleBooks.map((book) => {
                const isRequested = requests.some((request) => request.book.title === book.title && request.status === "Requested");
                return (
                  <article className="book-card" key={book.title}>
                    <div className="book-cover">{book.title.charAt(0)}</div>
                    <div className="book-card-content">
                      <span className="book-category">{book.category}</span>
                      <h3>{book.title}</h3>
                      <p>By {book.author}</p>
                      <button className="book-button" type="button" disabled={isRequested} onClick={() => requestBook(book)}>
                        {isRequested ? "Requested" : "Request this title"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <button className="catalog-requests-link" type="button" onClick={() => navigate("/student-dashboard/requests")}>
              View all requests →
            </button>
          </section>

        </main>

      ) : (

        /* =======================================================
           CHILD ROUTES
        ======================================================== */

        <Outlet
          context={{
            currentUser,
            filteredBooks,
            requests,
            requestBook,
            searchTerm,
          }}
        />

      )}

    </div>
  );
};

export default StudentDashboard;
