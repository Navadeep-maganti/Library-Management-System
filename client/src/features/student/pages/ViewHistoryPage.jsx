import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "Not available";
const formatToken = (reservationId) => reservationId ? `TOK-${String(reservationId).padStart(6, "0")}` : "-";

const normalizeHistory = (student) => {
  const issuedBooks = student.issuedBooks || [];
  const reservations = student.reservations || [];
  const fines = student.fines || [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return issuedBooks.map((issuedBook) => {
    const reservation = reservations
      .filter((item) => item.bookId === issuedBook.bookId)
      .sort((first, second) => new Date(second.reservedDate) - new Date(first.reservedDate))[0];
    const dueTime = new Date(issuedBook.dueDate).getTime();
    const comparisonTime = issuedBook.returnDate ? new Date(issuedBook.returnDate).getTime() : now;
    const overdueDays = Math.max(0, Math.floor((comparisonTime - dueTime) / dayMs));
    const fineAmount = fines
      .filter((fine) => fine.issuedBookId === issuedBook.id)
      .reduce((total, fine) => total + Number(fine.amount || 0), 0);

    return {
      id: issuedBook.id,
      token: formatToken(reservation?.id),
      title: issuedBook.book?.title || "Book unavailable",
      author: issuedBook.book?.author || "Unknown author",
      bookId: issuedBook.bookId,
      requestedOn: reservation?.reservedDate,
      issuedOn: issuedBook.issueDate,
      dueDate: issuedBook.dueDate,
      overdueDays,
      fineAmount,
      status: issuedBook.isReturned ? "Returned" : "Issued",
    };
  });
};

const ViewHistoryPage = () => {
  const { currentUser } = useOutletContext();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const rollNo = currentUser.roll_no || currentUser.rollNo;
    if (!rollNo) {
      setIsLoading(false);
      setError("Student roll number is not available.");
      return;
    }

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/students/${encodeURIComponent(rollNo)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load borrowing history.");
        setHistoryItems(normalizeHistory(data.student));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [currentUser.rollNo, currentUser.roll_no]);

  const visibleItems = useMemo(() => historyItems.filter((item) =>
    (status === "All" || item.status === status) &&
    `${item.title} ${item.author} ${item.bookId || ""} ${item.token}`.toLowerCase().includes(query.toLowerCase())
  ), [historyItems, query, status]);

  return (
    <section className="student-info-panel">
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">BORROWING RECORD</p>
          <h2>View History</h2>
        </div>
      </div>
      <div className="page-tools">
        <label className="field-with-label">
          <span>Find a book</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search history" />
        </label>
        <label className="field-with-label">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option><option>Issued</option><option>Returned</option>
          </select>
        </label>
      </div>
      <section className="issued-books-block">
        <div className="issued-books-heading">
          <div>
            <p className="student-kicker">ISSUED BOOKS</p>
            <h3>Borrowing details</h3>
          </div>
          <span className="book-count">{visibleItems.length} {visibleItems.length === 1 ? "book" : "books"}</span>
        </div>
        {isLoading ? (
          <p className="empty-search">Loading issued books...</p>
        ) : error ? (
          <p className="browse-books-message">{error}</p>
        ) : (
          <div className="history-table-wrap">
            <div className="history-table" role="table">
              {/* Always show header */}
              <div className="history-row history-header" role="row">
                <span>Token ID</span>
                <span>Book name</span>
                <span>Requested on</span>
                <span>Issued on</span>
                <span>Due date</span>
                <span>Overdue days</span>
                <span>Fine amount</span>
              </div>

              {/* Show rows or empty message */}
              {visibleItems.length ? (
                visibleItems.map((item) => (
                  <div className="history-row" role="row" key={item.id}>
                    <span className="history-request-id">{item.token}</span>
                    <span className="history-book-cell">
                      <strong>{item.title}</strong>
                      <small>{item.author} · Book ID: {item.bookId || "-"}</small>
                    </span>
                    <span>{formatDate(item.requestedOn)}</span>
                    <span>{formatDate(item.issuedOn)}</span>
                    <span>{formatDate(item.dueDate)}</span>
                    <span className={item.overdueDays > 0 ? "history-warning" : ""}>{item.overdueDays}</span>
                    <span>{Number(item.fineAmount).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="history-row">
                  <span className="empty-search" style={{ gridColumn: "1 / -1" }}>
                    No matching issued books.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </section>
  );
};

export default ViewHistoryPage;
