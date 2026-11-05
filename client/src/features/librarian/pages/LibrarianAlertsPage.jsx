import React, { useEffect, useState } from "react";
import "../styles/LibrarianProfilePage.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "").replace(/\/api$/, "");

const LibrarianAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcements`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load alerts.");
      setAlerts(Array.isArray(data.announcements) ? data.announcements : []);
    } catch (requestError) {
      setError(requestError.message || "Could not load alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const dismissAlert = async (id) => {
    setActionLoading(id);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcements/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Could not dismiss alert.");
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    } catch (requestError) {
      setError(requestError.message || "Could not dismiss alert.");
    } finally {
      setActionLoading(null);
    }
  };

  const clearAlerts = async () => {
    if (!alerts.length) return;
    setActionLoading("all");
    setError("");
    try {
      const results = await Promise.all(alerts.map((alert) => fetch(`${API_BASE_URL}/api/announcements/${alert.id}`, { method: "DELETE" })));
      const failed = results.find((response) => !response.ok);
      if (failed) throw new Error("Some alerts could not be cleared. Please try again.");
      setAlerts([]);
    } catch (requestError) {
      setError(requestError.message || "Could not clear alerts.");
      await loadAlerts();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section className="librarian-profile-page librarian-alerts-page">
      <div className="librarian-profile-heading"><div><p className="librarian-profile-kicker">LIBRARY UPDATES</p><h1>Alerts <span className="librarian-alert-count">{alerts.length}</span></h1></div><div className="librarian-alert-actions"><button type="button" className="librarian-profile-edit-button" onClick={loadAlerts} disabled={loading || actionLoading !== null}>Refresh</button><button type="button" className="librarian-profile-edit-button" onClick={clearAlerts} disabled={!alerts.length || actionLoading !== null}>{actionLoading === "all" ? "Clearing..." : "Clear all"}</button></div></div>
      {error && <p className="librarian-profile-page-notice librarian-profile-page-error" role="alert">{error}</p>}
      {loading ? <p>Loading library updates...</p> : alerts.length ? <div className="librarian-alert-list">{alerts.map((alert) => <article className="librarian-alert-card" key={alert.id}><span className="librarian-alert-icon">i</span><div><small>LIBRARY ANNOUNCEMENT</small><h3>{alert.title}</h3><p>{alert.content}</p><time>{new Date(alert.createdAt).toLocaleString()}</time></div><button type="button" disabled={actionLoading !== null} onClick={() => dismissAlert(alert.id)}>{actionLoading === alert.id ? "Dismissing..." : "Dismiss"}</button></article>)}</div> : <p>You are all caught up.</p>}
    </section>
  );
};

export default LibrarianAlertsPage;
