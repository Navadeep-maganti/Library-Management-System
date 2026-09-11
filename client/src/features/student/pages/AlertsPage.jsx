import React, { useEffect, useState } from "react";

const formatReceivedAt = (value) => new Date(value).toLocaleString([], {
  dateStyle: "medium",
  timeStyle: "short",
});

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await fetch("/api/announcements");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load library updates.");
        setAlerts((data.announcements || []).map((announcement) => ({
          id: announcement.id,
          type: "announcement",
          icon: "i",
          label: "LIBRARY ANNOUNCEMENT",
          title: announcement.title,
          detail: announcement.content,
          receivedAt: announcement.createdAt,
          unread: true,
        })));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();
  }, []);
  const unreadCount = alerts.filter((alert) => alert.unread).length;

  const markAllRead = () => setAlerts((current) => current.map((alert) => ({ ...alert, unread: false })));

  return (
    <section className="student-info-panel">
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">LIBRARY UPDATES</p>
          <h2>Alerts <span className="heading-count">{unreadCount}</span></h2>
        </div>
        <button className="text-button" type="button" onClick={markAllRead} disabled={!unreadCount}>Mark all as read</button>
      </div>
      <div className="alert-list">
        {isLoading ? <p className="empty-search">Loading library updates...</p> : error ? <p className="browse-books-message">{error}</p> : alerts.length ? alerts.map((alert) => (
          <article className={`library-alert alert-${alert.type} ${alert.unread ? "alert-unread" : ""}`} key={alert.id}>
            <div className="library-alert-icon" aria-hidden="true">{alert.icon}</div>
            <div className="library-alert-copy"><span className="library-alert-label">{alert.label}</span><strong>{alert.title}</strong><span>{alert.detail}</span><time dateTime={alert.receivedAt}>Received {formatReceivedAt(alert.receivedAt)}</time></div>
            <button className="icon-text-button" type="button" onClick={() => setAlerts((current) => current.filter((item) => item.id !== alert.id))}>Dismiss</button>
          </article>
        )) : <p className="empty-search">You are all caught up.</p>}
      </div>
    </section>
  );
};

export default AlertsPage;
