import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LibrarianReservationsPage.css";

const formatRemaining = (expiresAt, now) => {
  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const LibrarianReservationsPage = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadReservations = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setError("");
      const response = await fetch("/api/reservations");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load reservations.");
      setReservations(data.reservations || []);
    } catch (err) {
      if (!isSilent) setError(err.message || "Unable to load reservations.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
    const refreshId = window.setInterval(() => loadReservations(true), 20_000);
    return () => window.clearInterval(refreshId);
  }, [loadReservations]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timerId);
  }, []);

  // Metrics
  const totalCount = reservations.length;
  const activeCount = reservations.filter((r) => r.status?.status === "Reserved" && new Date(r.expiresAt).getTime() > now).length;
  const expiredCount = reservations.filter((r) => r.status?.status === "Expired" || (r.status?.status === "Reserved" && new Date(r.expiresAt).getTime() <= now)).length;
  const issuedCount = reservations.filter((r) => r.status?.status === "Issued" || r.status?.status === "Completed").length;

  // Filtered reservations
  const filteredReservations = reservations.filter((r) => {
    const isActive = r.status?.status === "Reserved" && new Date(r.expiresAt).getTime() > now;
    const isExpired = r.status?.status === "Expired" || (r.status?.status === "Reserved" && new Date(r.expiresAt).getTime() <= now);
    const isIssued = r.status?.status === "Issued" || r.status?.status === "Completed";

    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "issued" && !isIssued) return false;
    if (statusFilter === "expired" && !isExpired) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchesToken = (r.token || "").toLowerCase().includes(q) || `res-${r.id}`.toLowerCase().includes(q);
      const matchesStudent =
        (r.student?.user?.username || "").toLowerCase().includes(q) ||
        (r.student?.rollNo || r.studentId || "").toLowerCase().includes(q);
      const matchesBook =
        (r.book?.title || "").toLowerCase().includes(q) ||
        (r.book?.author || "").toLowerCase().includes(q) ||
        (r.book?.isbn || "").toLowerCase().includes(q);

      return matchesToken || matchesStudent || matchesBook;
    }

    return true;
  });

  return (
    <div className="reservations-page-container">
      {/* Header Banner */}
      <header className="reservations-header">
        <span className="reservations-badge">Step 1 · Reservations</span>
        <h2>Student book reservations</h2>
        <p>All reservations are held for 30 minutes. Expired reservations are released back into inventory automatically.</p>
      </header>

      {/* Metrics Grid */}
      <div className="reservations-metrics-grid">
        <div
          className={`reservations-metric-card ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <span className="reservations-metric-label">Total Reservations</span>
          <span className="reservations-metric-val">{totalCount}</span>
        </div>

        <div
          className={`reservations-metric-card ${statusFilter === "active" ? "active" : ""}`}
          onClick={() => setStatusFilter("active")}
        >
          <span className="reservations-metric-label">Active (Holding)</span>
          <span className="reservations-metric-val avail">{activeCount}</span>
        </div>

        <div
          className={`reservations-metric-card ${statusFilter === "issued" ? "active" : ""}`}
          onClick={() => setStatusFilter("issued")}
        >
          <span className="reservations-metric-label">Verified & Issued</span>
          <span className="reservations-metric-val issued">{issuedCount}</span>
        </div>

        <div
          className={`reservations-metric-card ${statusFilter === "expired" ? "active" : ""}`}
          onClick={() => setStatusFilter("expired")}
        >
          <span className="reservations-metric-label">Expired / Released</span>
          <span className="reservations-metric-val low">{expiredCount}</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="reservations-card">
        {/* Search and Filters Toolbar */}
        <div className="reservations-toolbar">
          <div className="reservations-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by student name, roll number, book title, or 6-digit OTP code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="reservations-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="reservations-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "issued" ? "active" : ""}`}
              onClick={() => setStatusFilter("issued")}
            >
              Issued ({issuedCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "expired" ? "active" : ""}`}
              onClick={() => setStatusFilter("expired")}
            >
              Expired ({expiredCount})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="reservations-table-responsive">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Reservation ID</th>
                <th>Student</th>
                <th>Reserved Book</th>
                <th>Reserved At</th>
                <th>Verification Code</th>
                <th>Status</th>
                <th>Time Remaining</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="reservations-empty-state">
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <span className="spinning" style={{ fontSize: "1.5rem" }}>🔄</span>
                      <span>Loading reservations...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr><td colSpan="8" className="reservations-empty-state error">{error}</td></tr>
              ) : filteredReservations.length ? (
                filteredReservations.map((reservation) => {
                  const isActive = reservation.status?.status === "Reserved" && new Date(reservation.expiresAt).getTime() > now;
                  const isIssued = reservation.status?.status === "Issued" || reservation.status?.status === "Completed";
                  const isExpired = reservation.status?.status === "Expired" || (reservation.status?.status === "Reserved" && !isActive);

                  const statusClass = isIssued ? "issued" : isActive ? "active" : "expired";
                  const statusLabel = isIssued ? "✓ Issued" : isActive ? "● Reserved" : "⚠ Expired";

                  return (
                    <tr key={reservation.id}>
                      <td className="reservations-font-mono">RES-{String(reservation.id).padStart(4, "0")}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {reservation.student?.user?.username || "Unknown student"}
                        </div>
                        <div className="reservations-sub-text">Roll: {reservation.student?.rollNo || reservation.studentId}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a", maxWidth: "260px" }}>
                          {reservation.book?.title || "Book unavailable"}
                        </div>
                        <div className="reservations-sub-text">By {reservation.book?.author || "Unknown author"}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{new Date(reservation.reservedDate).toLocaleDateString()}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {new Date(reservation.reservedDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td>
                        <span className="reservations-token-code">{reservation.token}</span>
                      </td>
                      <td>
                        <span className={`reservations-badge-status ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td className="reservations-font-mono">
                        {isActive ? (
                          <span style={{ fontWeight: 800, color: "#0f766e" }}>
                            ⏱ {formatRemaining(reservation.expiresAt, now)}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>--:--</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isActive ? (
                          <button
                            type="button"
                            className="reservations-btn-verify"
                            onClick={() => navigate(`/librarian/verify-token?token=${reservation.token}`)}
                          >
                            🔑 Verify OTP
                          </button>
                        ) : isIssued ? (
                          <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>
                            ✓ Completed
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                            Released
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="reservations-empty-state">
                    {searchTerm ? `No reservations matching "${searchTerm}"` : "No reservations found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LibrarianReservationsPage;
