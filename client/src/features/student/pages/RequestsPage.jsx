import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

const RESERVATION_WINDOW_MS = 30 * 60 * 1000;
const formatDate = (value) => new Date(value).toLocaleString();
const formatDay = (value) => new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date(value));
const formatMonth = (value) => new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
}).format(new Date(value));
const isActiveReservation = (status) => status === "Reserved";
const getRemainingMs = (reservedDate, now) => Math.max(0, new Date(reservedDate).getTime() + RESERVATION_WINDOW_MS - now);
const formatTimer = (remainingMs) => {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const getGroupKey = (value, mode) => {
  const date = new Date(value);
  if (mode === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getGroupLabel = (value, mode) => (mode === "month" ? formatMonth(value) : formatDay(value));

const RequestsTable = ({ requests, emptyMessage, now, cancellingId, onCancel }) => (
  requests.length ? (
    <div className="requests-table" role="table">
      <div className="requests-row requests-header" role="row">
        <span>Requested token</span>
        <span>Queue position</span>
        <span>Book details</span>
        <span>Reserved on</span>
        <span>Claim window</span>
        <span>Status</span>
        <span>Action</span>
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
          <span><strong className={`status-badge ${request.status.toLowerCase()}`}>{request.status}</strong></span>
          <span>
            <button
              className="request-cancel-button"
              type="button"
              disabled={request.status !== "Reserved" || cancellingId === request.id}
              onClick={() => onCancel(request.id)}
            >
              {cancellingId === request.id ? "Cancelling..." : "Cancel"}
            </button>
          </span>
        </div>
      ))}
    </div>
  ) : <div className="borrowed-books-empty"><h3>{emptyMessage}</h3></div>
);

const RequestsPage = () => {
  const { requests, cancelReservation, reservationQuota = { totalUsedToday: 0, totalDailyLimit: 5 } } = useOutletContext();
  const [now, setNow] = useState(Date.now());
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [groupMode, setGroupMode] = useState("all");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCancel = async (reservationId) => {
    setCancellingId(reservationId);
    setCancelError("");
    try {
      await cancelReservation(reservationId);
    } catch (error) {
      setCancelError(error.message);
    } finally {
      setCancellingId(null);
    }
  };

  const groupedRequests = useMemo(() => {
    if (groupMode === "all") return [];

    const groups = new Map();
    requests.forEach((request) => {
      const key = getGroupKey(request.reservedDate, groupMode);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(request);
    });

    return [...groups.entries()]
      .map(([key, grouped]) => ({
        key,
        label: getGroupLabel(grouped[0].reservedDate, groupMode),
        requests: grouped.sort((first, second) => new Date(second.reservedDate) - new Date(first.reservedDate)),
      }))
      .sort((first, second) => second.key.localeCompare(first.key));
  }, [groupMode, requests]);

  const tableProps = {
    emptyMessage: "No book requests yet.",
    now,
    cancellingId,
    onCancel: handleCancel,
  };

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
          <span className="book-count">{requests.length} {requests.length === 1 ? "request" : "requests"}</span>
        </div>
        <div style={{ margin: "12px 0 18px", display: "inline-flex", alignItems: "center", gap: "8px", background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", borderRadius: "999px", padding: "8px 14px", fontWeight: 700 }}>
          Today: {reservationQuota.totalUsedToday}/{reservationQuota.totalDailyLimit}
        </div>
        <div className="requests-view-toolbar" aria-label="Group requests">
          <span className="requests-view-label">Organize by</span>
          <div className="requests-view-switcher" role="group" aria-label="Request grouping">
            {[{ value: "all", label: "All requests" }, { value: "day", label: "Day" }, { value: "month", label: "Month" }].map((option) => (
              <button
                className={groupMode === option.value ? "requests-view-option active" : "requests-view-option"}
                key={option.value}
                type="button"
                aria-pressed={groupMode === option.value}
                onClick={() => setGroupMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {cancelError && <div className="browse-books-message" role="alert">{cancelError}</div>}
        {groupMode === "all" ? (
          <RequestsTable requests={requests} {...tableProps} />
        ) : groupedRequests.length ? (
          <div className="request-groups">
            {groupedRequests.map((group) => (
              <section className="request-group" key={group.key}>
                <div className="request-group-heading">
                  <div>
                    <span className="request-group-kicker">{groupMode === "day" ? "REQUEST DAY" : "REQUEST MONTH"}</span>
                    <h3>{group.label}</h3>
                  </div>
                  <span className="request-group-count">{group.requests.length} {group.requests.length === 1 ? "request" : "requests"}</span>
                </div>
                <RequestsTable requests={group.requests} {...tableProps} />
              </section>
            ))}
          </div>
        ) : <div className="borrowed-books-empty"><h3>No book requests yet.</h3></div>}
      </section>

    </main>
  );
};

export default RequestsPage;
