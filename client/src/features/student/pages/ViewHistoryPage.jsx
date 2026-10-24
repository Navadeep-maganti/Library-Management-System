import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "Not available";
const formatToken = (reservation) => {
  if (!reservation) return "-";
  if (reservation.token) {
    const raw = String(reservation.token).replace(/^TOK-/i, "");
    return `TOK-${raw}`;
  }
  if (reservation.id) {
    return `TOK-${String(reservation.id).padStart(6, "0")}`;
  }
  return "-";
};

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
      token: formatToken(reservation),
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshNotice, setRefreshNotice] = useState(null);

  const fetchHistory = useCallback(async () => {
    const rollNo = currentUser.roll_no || currentUser.rollNo;
    if (!rollNo) throw new Error("Student roll number is not available.");
    const response = await fetch(`/api/students/${encodeURIComponent(rollNo)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not load borrowing history.");
    return normalizeHistory(data.student);
  }, [currentUser.rollNo, currentUser.roll_no]);

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        const items = await fetchHistory();
        if (isCurrent) setHistoryItems(items);
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError.message);
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    load();
    return () => { isCurrent = false; };
  }, [fetchHistory]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const items = await fetchHistory();
      setHistoryItems(items);
      setError("");
      setRefreshNotice({ type: "success", text: "Your borrowing history is up to date." });
    } catch (loadError) {
      setError(loadError.message);
      setRefreshNotice({ type: "error", text: loadError.message || "Could not refresh your borrowing history." });
    } finally {
      setRefreshing(false);
    }
  };

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
        <button
          type="button"
          className="issued-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh your borrowing history"
        >
          <span className={refreshing ? "spinning" : ""} aria-hidden="true">🔄</span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {refreshNotice && (
        <div className={`student-refresh-notice ${refreshNotice.type}`} role={refreshNotice.type === "error" ? "alert" : "status"}>
          <span aria-hidden="true">{refreshNotice.type === "success" ? "✓" : "⚠"}</span>
          {refreshNotice.text}
        </div>
      )}
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
          <div className="history-loading" role="status" aria-live="polite">
            <span className="history-loading-spinner" aria-hidden="true" />
            <span>Loading issued books...</span>
          </div>
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
