import React, { useMemo, useState } from "react";

const historyItems = [
  {
    id: "history-1",
    token: "REQ-HIST7A21F4",
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    category: "Algorithms",
    copies: 1,
    requestedOn: "10 Aug 2026, 09:42 AM",
    issuedOn: "11 Aug 2026, 02:15 PM",
    dueDate: "25 Aug 2026",
    returnedOn: "12 Aug 2026, 04:30 PM",
    status: "Returned",
  },
  {
    id: "history-2",
    token: "REQ-HIST3C98B2",
    title: "Operating System Concepts",
    author: "Abraham Silberschatz",
    category: "Systems",
    copies: 1,
    requestedOn: "17 Aug 2026, 11:08 AM",
    issuedOn: "18 Aug 2026, 10:20 AM",
    dueDate: "01 Sep 2026",
    returnedOn: null,
    status: "Issued",
  },
];

const ViewHistoryPage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const visibleItems = useMemo(() => historyItems.filter((item) =>
    (status === "All" || item.status === status) && `${item.title} ${item.author} ${item.token}`.toLowerCase().includes(query.toLowerCase())), [query, status]);

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
        {visibleItems.length ? visibleItems.map((item) => (
          <article className="history-timeline-card" key={item.id}>
            <div className="history-book-summary">
              <div className="history-book-cover">{item.title.charAt(0)}</div>
              <div>
                <span className="book-category">{item.category}</span>
                <h3>{item.title}</h3>
                <p>By {item.author} · {item.copies} {item.copies === 1 ? "copy" : "copies"}</p>
                <span className="request-token-label">Requested token: {item.token}</span>
              </div>
              <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
            </div>
            <div className="history-timeline" aria-label={`History for ${item.title}`}>
              <div className="timeline-step complete">
                <span className="timeline-marker">1</span>
                <div><strong>Booking requested on</strong><span>{item.requestedOn}</span></div>
              </div>
              <div className="timeline-step complete">
                <span className="timeline-marker">2</span>
                <div><strong>Book issued on</strong><span>{item.issuedOn} · Due date: {item.dueDate}</span></div>
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
