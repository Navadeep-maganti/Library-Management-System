import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

const demoReturnRequests = [
  {
    id: "return-request-1",
    token: "RET-OSC82A10",
    book: { title: "Operating System Concepts", author: "Abraham Silberschatz", category: "Systems", copies: 1 },
    issuedOn: "18 Aug 2026",
    dueDate: "30 Aug 2026",
    status: "Pending",
  },
  {
    id: "return-request-2",
    token: "RET-CC41D72B",
    book: { title: "Clean Code", author: "Robert C. Martin", category: "Software Engineering", copies: 1 },
    issuedOn: "04 Aug 2026",
    dueDate: "18 Aug 2026",
    status: "Returned",
  },
];

const formatDate = (value) => new Date(value).toLocaleString();
const formatRemaining = (expiresAt, now) => {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(remaining / 60000).toString().padStart(2, "0");
  const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const RequestsTable = ({ requests, emptyMessage, showTimer = false, now }) => (
  requests.length ? (
    <div className={`requests-table ${showTimer ? "requests-timer-table" : ""}`} role="table">
      <div className="requests-row requests-header" role="row">
        <span>Requested token</span>
        {showTimer && <span>Claim timer</span>}
        <span>Book details</span>
        <span>Issued on</span>
        <span>Due date</span>
        <span>Status</span>
      </div>
      {requests.map((request) => (
        <div className="requests-row" role="row" key={request.id}>
          <span className="request-token">{request.token}</span>
          {showTimer && (
            <span className={`request-timer ${new Date(request.expiresAt).getTime() <= now ? "timer-expired" : ""}`}>
              {formatRemaining(request.expiresAt, now)}
            </span>
          )}
          <span className="request-book-details">
            <strong>{request.book.title}</strong>
            <small>{request.book.author} · {request.book.category} · {request.book.copies} {request.book.copies === 1 ? "copy" : "copies"}</small>
          </span>
          <span>{request.issuedOn || "Not issued"}</span>
          <span>{request.dueDate}</span>
          <span><strong className={`status-badge ${request.status.toLowerCase()}`}>{request.status}</strong></span>
        </div>
      ))}
    </div>
  ) : <div className="borrowed-books-empty"><h3>{emptyMessage}</h3></div>
);

const RequestsPage = () => {
  const { requests } = useOutletContext();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const requestedBookRequests = requests.map((request) => ({
    ...request,
    status: "Pending",
    issuedOn: "Not issued",
    dueDate: formatDate(request.expiresAt),
  }));

  return (
    <main className="requests-page">
      <section className="student-info-panel requests-intro">
        <p className="student-kicker">LIBRARY REQUESTS</p>
        <h1>Requests</h1>
        <p className="request-highlight">Please collect and return every requested book to the librarian before its due date. Late returns may affect your library access.</p>
      </section>

      <section className="student-info-panel requests-section">
        <div className="catalog-heading">
          <div>
            <p className="student-kicker">RESERVED TITLES</p>
            <h2>My Booking Requests</h2>
          </div>
          <span className="book-count">{requestedBookRequests.length} requests</span>
        </div>
        <RequestsTable requests={requestedBookRequests} emptyMessage="No book requests yet." now={now} showTimer />
      </section>

      <section className="student-info-panel requests-section">
        <div className="catalog-heading">
          <div>
            <p className="student-kicker">RETURN DESK</p>
            <h2>My Return Requests</h2>
          </div>
          <span className="book-count">{demoReturnRequests.length} requests</span>
        </div>
        <RequestsTable requests={demoReturnRequests} emptyMessage="No return requests yet." />
      </section>
    </main>
  );
};

export default RequestsPage;
