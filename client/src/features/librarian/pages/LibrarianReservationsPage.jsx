import React, { useCallback, useEffect, useState } from "react";
import "../styles/LibrarianReservationsPage.css";

const formatRemaining = (expiresAt, now) => {
  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const LibrarianReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadReservations = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/reservations");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load reservations.");
      setReservations(data.reservations || []);
    } catch (err) {
      setError(err.message || "Unable to load reservations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
    const refreshId = window.setInterval(loadReservations, 30_000);
    return () => window.clearInterval(refreshId);
  }, [loadReservations]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="requests-page-container">
      <div className="requests-header">
        <div className="requests-badge">Reservations</div>
        <h2>Student Book Reservations</h2>
        <p>All reservations are held for 30 minutes. Expired reservations are released automatically.</p>
      </div>

      <div className="requests-card">
        <div className="requests-table-responsive">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Reservation ID</th>
                <th>Student</th>
                <th>Reserved Book</th>
                <th>Reserved At</th>
                <th>Verification Code</th>
                <th>Status</th>
                <th>Time Remaining</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="requests-empty-state">Loading reservations...</td></tr>
              ) : error ? (
                <tr><td colSpan="7" className="requests-empty-state">{error}</td></tr>
              ) : reservations.length ? (
                reservations.map((reservation) => {
                  const isActive = reservation.status?.status === "Reserved" && new Date(reservation.expiresAt).getTime() > now;
                  return (
                    <tr key={reservation.id}>
                      <td className="requests-font-mono">RES-{String(reservation.id).padStart(4, "0")}</td>
                      <td>
                        <strong>{reservation.student?.user?.username || "Unknown student"}</strong>
                        <div className="requests-sub-text">Roll: {reservation.student?.rollNo || reservation.studentId}</div>
                      </td>
                      <td>
                        <strong>{reservation.book?.title || "Book unavailable"}</strong>
                        <div className="requests-sub-text">By {reservation.book?.author || "Unknown author"}</div>
                      </td>
                      <td>{new Date(reservation.reservedDate).toLocaleString()}</td>
                      <td><span className="requests-token-code">{reservation.token}</span></td>
                      <td><span className="requests-badge-status">{reservation.status?.status || "Unknown"}</span></td>
                      <td className="requests-font-mono">{isActive ? formatRemaining(reservation.expiresAt, now) : "--:--"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="7" className="requests-empty-state">No reservations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LibrarianReservationsPage;
