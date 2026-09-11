import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import StudentNavbar from "../components/StudentNavbar";
import { dummyStudentUser } from "../data/studentData";
import "../styles/StudentDashboard.css";

/*
|--------------------------------------------------------------------------
| TEMPORARY DASHBOARD DATA
|--------------------------------------------------------------------------
| This data is only for the UI prototype.
| Later, these values will come from the backend API.
*/

const normalizeReservation = (reservation) => ({
  id: reservation.id,
  token: reservation.token || `TOK-${String(reservation.id).padStart(4, "0")}`,
  book: {
    ...reservation.book,
    category: reservation.book?.category?.name || reservation.book?.category || "Reserved title",
    copies: 1,
  },
  bookedOn: reservation.reservedDate,
  reservedDate: reservation.reservedDate,
  expiresAt: reservation.expiresAt,
  remainingMs: reservation.remainingMs,
  formattedRemaining: reservation.formattedRemaining,
  queuePosition: reservation.queuePosition,
  status: reservation.status?.status || "Reserved",
});

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
  const [requests, setRequests] = useState([]);
  const [requestsError, setRequestsError] = useState("");
  const [requestingBookId, setRequestingBookId] = useState(null);
  const [catalogBooks, setCatalogBooks] = useState([]);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ borrowed: 0, overdue: 0, pendingFine: 0, finePaid: 0 });
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

  useEffect(() => {
    const rollNo = currentUser.roll_no || currentUser.rollNo;
    if (!rollNo) return;

    const loadReservations = async () => {
      try {
        const response = await fetch(`/api/reservations?studentId=${encodeURIComponent(rollNo)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load your reservations.");
        setRequests((data.reservations || []).map(normalizeReservation));
      } catch (loadError) {
        setRequestsError(loadError.message);
      }
    };

    loadReservations();
  }, [currentUser.rollNo, currentUser.roll_no]);

  useEffect(() => {
    const rollNo = currentUser.roll_no || currentUser.rollNo;
    if (!rollNo) return;

    const loadStudentSummary = async () => {
      try {
        const response = await fetch(`/api/students/${encodeURIComponent(rollNo)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load your library summary.");

        const issuedBooks = data.student.issuedBooks || [];
        const fines = data.student.fines || [];
        const now = Date.now();
        setBorrowedBooks(issuedBooks.map((issuedBook) => ({
          id: issuedBook.id,
          title: issuedBook.book?.title || "Book unavailable",
          author: issuedBook.book?.author || "Unknown author",
          copies: 1,
          issueDate: new Date(issuedBook.issueDate).toLocaleDateString(),
          dueDate: new Date(issuedBook.dueDate).toLocaleDateString(),
        })));
        setDashboardStats({
          borrowed: issuedBooks.length,
          overdue: issuedBooks.filter((issuedBook) => new Date(issuedBook.dueDate).getTime() < now).length,
          pendingFine: fines.filter((fine) => !fine.isPaid).reduce((total, fine) => total + Number(fine.amount), 0),
          finePaid: fines.filter((fine) => fine.isPaid).reduce((total, fine) => total + Number(fine.amount), 0),
        });
      } catch (loadError) {
        setRequestsError(loadError.message);
      }
    };

    loadStudentSummary();
  }, [currentUser.rollNo, currentUser.roll_no]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch("/api/books?limit=8&sortBy=title&order=asc");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load the library catalog.");
        setCatalogBooks(data.books || []);
      } catch (loadError) {
        setRequestsError(loadError.message);
      }
    };

    loadCatalog();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | DEPARTMENT BOOK DATA
  |--------------------------------------------------------------------------
  | Kept for the existing student catalogue routes.
  |--------------------------------------------------------------------------
  */

  /*
  |--------------------------------------------------------------------------
  | EXISTING BOOK SEARCH / FILTER / SORT
  |--------------------------------------------------------------------------
  */

  const filteredBooks = catalogBooks.filter((book) =>
    `${book.title} ${book.author} ${book.category?.name || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const categories = [
    "All",
    ...new Set(filteredBooks.map((book) => book.category?.name || "Uncategorized")),
  ];

  const visibleBooks = useMemo(
    () =>
      filteredBooks
        .filter(
          (book) =>
            category === "All" || (book.category?.name || "Uncategorized") === category,
        )
        .sort((firstBook, secondBook) =>
          (sortBy === "category" ? firstBook.category?.name || "" : firstBook[sortBy])
            .localeCompare(sortBy === "category" ? secondBook.category?.name || "" : secondBook[sortBy]),
        ),
    [category, filteredBooks, sortBy],
  );

  /*
  |--------------------------------------------------------------------------
  | REQUEST BOOK
  |--------------------------------------------------------------------------
  */

  const requestBook = async (book) => {
    const rollNo = currentUser.roll_no || currentUser.rollNo;
    const alreadyReserved = requests.some(
      (request) => request.book?.id === book.id && ["Requested", "Booked", "Reserved"].includes(request.status),
    );

    if (!rollNo) {
      setRequestsError("Your student roll number is not available. Please sign in again.");
      return;
    }
    if (alreadyReserved || requestingBookId === book.id) return;

    setRequestingBookId(book.id);
    setRequestsError("");
    try {
      const response = await fetch("/api/reservations", {
        body: JSON.stringify({ studentId: rollNo, bookId: book.id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not reserve this book.");

      setRequests((current) => [...current, normalizeReservation(data.reservation)]);
      setRequestsError("");
      setIssuanceNoticeBook(book);
    } catch (requestError) {
      setRequestsError(requestError.message);
    } finally {
      setRequestingBookId(null);
    }
  };

  const cancelReservation = async (reservationId) => {
    const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
      method: "PATCH",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not cancel the expired reservation.");

    setRequests((current) => current.map((request) => (
      request.id === reservationId ? { ...request, status: "Cancelled" } : request
    )));
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

      {requestsError && <div className="student-api-error" role="alert">{requestsError}</div>}

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
            requestingBookId,
            cancelReservation,
            searchTerm,
          }}
        />

      )}

    </div>
  );
};

export default StudentDashboard;
