import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "Not available";

const normalizeHistory = (student) => {
  const issuedBooks = student.issuedBooks || [];

  return (student.borrowHistories || []).map((history) => {
    const issuedRecord = issuedBooks.find(
      (issuedBook) => issuedBook.bookId === history.bookId && new Date(issuedBook.issueDate).getTime() === new Date(history.issueDate).getTime(),
    );
    const book = history.book || issuedRecord?.book;
    const returnedOn = history.returnDate || (issuedRecord?.isReturned ? issuedRecord.returnDate : null);

    return {
      id: history.id,
      title: book?.title || "Book unavailable",
      author: book?.author || "Unknown author",
      category: book?.category?.name || "Uncategorized",
      copies: 1,
      requestedOn: null,
      issuedOn: history.issueDate,
      dueDate: issuedRecord?.dueDate,
      returnedOn,
      status: returnedOn ? "Returned" : "Issued",
      token: null,
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
    (status === "All" || item.status === status) && `${item.title} ${item.author} ${item.token || ""}`.toLowerCase().includes(query.toLowerCase())), [historyItems, query, status]);

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
      <div className="history-timeline-list">
        {isLoading ? <p className="empty-search">Loading borrowing history...</p> : error ? <p className="browse-books-message">{error}</p> : visibleItems.length ? visibleItems.map((item) => (
          <article className="history-timeline-card" key={item.id}>
            <div className="history-book-summary">
              <div className="history-book-cover">{item.title.charAt(0)}</div>
              <div>
                <span className="book-category">{item.category}</span>
                <h3>{item.title}</h3>
                <p>By {item.author} · {item.copies} {item.copies === 1 ? "copy" : "copies"}</p>
                {item.token && <span className="request-token-label">Requested token: {item.token}</span>}
              </div>
              <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
            </div>
            <div className="history-timeline" aria-label={`History for ${item.title}`}>
              <div className="timeline-step complete">
                <span className="timeline-marker">1</span>
                <div><strong>Borrowing record created</strong><span>{formatDate(item.issuedOn)}</span></div>
              </div>
              <div className="timeline-step complete">
                <span className="timeline-marker">2</span>
                <div><strong>Book issued on</strong><span>{formatDate(item.issuedOn)}{item.dueDate ? ` · Due date: ${formatDate(item.dueDate)}` : ""}</span></div>
              </div>
              <div className={`timeline-step ${item.returnedOn ? "complete" : "current"}`}>
                <span className="timeline-marker">3</span>
                <div><strong>Returned</strong><span>{item.returnedOn || "Not returned yet. Please return it before the due date."}</span></div>
              </div>
            </div>
          </article>
        )) : <p className="empty-search">No matching borrowing records.</p>}
      </div>
    </section>
  );
};

export default ViewHistoryPage;
