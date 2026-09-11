import React, { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

const RESERVATION_WINDOW_MS = 30 * 60 * 1000;
const formatDate = (value) => new Date(value).toLocaleString();
const isActiveReservation = (status) => ["Reserved", "Requested", "Booked"].includes(status);
const getRemainingMs = (reservedDate, now) => Math.max(0, new Date(reservedDate).getTime() + RESERVATION_WINDOW_MS - now);
const formatTimer = (remainingMs) => {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const RequestsTable = ({ requests, emptyMessage, now, expiringIds }) => (
  requests.length ? (
    <div className="requests-table" role="table">
      <div className="requests-row requests-header" role="row">
        <span>Requested token</span>
        <span>Queue position</span>
        <span>Book details</span>
        <span>Reserved on</span>
        <span>Claim window</span>
        <span>Status</span>
      </div>
      {requests.map((request) => (
        <div className="requests-row" role="row" key={request.id}>
          <span className="request-token">{request.token}</span>
          <span>{request.queuePosition || "-"}</span>
          <span className="request-book-details">
            <strong>{request.book.title}</strong>
            <small>{request.book.author} · {request.book.category}</small>
          </span>
          <span>{formatDate(request.reservedDate)}</span>
          <span className={`request-countdown ${getRemainingMs(request.reservedDate, now) === 0 && isActiveReservation(request.status) ? "request-countdown-expired" : ""}`}>
            {isActiveReservation(request.status) ? formatTimer(getRemainingMs(request.reservedDate, now)) : "Closed"}
          </span>
          <span><strong className={`status-badge ${request.status.toLowerCase()}`}>{expiringIds.has(request.id) ? "Cancelling..." : request.status}</strong></span>
        </div>
      ))}
    </div>
  ) : <div className="borrowed-books-empty"><h3>{emptyMessage}</h3></div>
);

const RequestsPage = () => {
  const { requests, cancelReservation } = useOutletContext();
  const [now, setNow] = useState(Date.now());
  const [expiringIds, setExpiringIds] = useState(() => new Set());
  const cancelledIds = useRef(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    requests.forEach((request) => {
      if (!isActiveReservation(request.status) || getRemainingMs(request.reservedDate, now) > 0 || cancelledIds.current.has(request.id)) return;

      cancelledIds.current.add(request.id);
      setExpiringIds((current) => new Set(current).add(request.id));
      cancelReservation(request.id)
        .catch(() => cancelledIds.current.delete(request.id))
        .finally(() => setExpiringIds((current) => {
          const next = new Set(current);
          next.delete(request.id);
          return next;
        }));
    });
  }, [now, requests, cancelReservation]);

  return (
    <main className="requests-page">
      <section className="student-info-panel requests-intro">
        <p className="student-kicker">LIBRARY REQUESTS</p>
        <h1>Requests</h1>
        <p className="request-highlight">Your reservations are held in the library queue. Check your position here for the latest status.</p>
      </section>

      <section className="student-info-panel requests-section">
        <div className="catalog-heading">
          <div>
            <p className="student-kicker">RESERVED TITLES</p>
            <h2>My Booking Requests</h2>
          </div>
          <span className="book-count">{requests.length} requests</span>
        </div>
        <RequestsTable requests={requests} emptyMessage="No book requests yet." now={now} expiringIds={expiringIds} />
      </section>

    </main>
  );
};

export default RequestsPage;
