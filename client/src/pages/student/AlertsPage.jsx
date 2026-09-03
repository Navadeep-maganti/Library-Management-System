import React, { useState } from "react";

const formatReceivedAt = (value) => new Date(value).toLocaleString([], {
  dateStyle: "medium",
  timeStyle: "short",
});

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([
    { id: 1, type: "issued", icon: "✓", label: "ISSUED SUCCESSFULLY", title: "Clean Code is ready for collection.", detail: "Your requested book has been issued. Please collect it from the library section within the allocated collection time.", receivedAt: "2026-08-28T09:15:00", unread: true },
    { id: 2, type: "due", icon: "!", label: "DUE DATE REMINDER · 3 DAYS LEFT", title: "Return Database System Concepts by 30 Aug 2026.", detail: "Day 1 reminder: return the book to the librarian before the due date to avoid late fines.", receivedAt: "2026-08-27T10:00:00", unread: true },
    { id: 3, type: "due", icon: "!", label: "DUE DATE REMINDER · 2 DAYS LEFT", title: "Database System Concepts is due soon.", detail: "Day 2 reminder: please plan your return to the library section before 30 Aug 2026.", receivedAt: "2026-08-28T10:00:00", unread: true },
    { id: 4, type: "due", icon: "!", label: "DUE DATE REMINDER · 1 DAY LEFT", title: "Database System Concepts is due tomorrow.", detail: "Final reminder: return the book to the librarian by 30 Aug 2026 to keep your account in good standing.", receivedAt: "2026-08-28T11:30:00", unread: true },
    { id: 5, type: "returned", icon: "✓", label: "RETURN COMPLETED", title: "Introduction to Algorithms was returned successfully.", detail: "The library has recorded your return. Thank you for returning the book on time.", receivedAt: "2026-08-26T16:30:00", unread: false },
  ]);
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
        {alerts.length ? alerts.map((alert) => (
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
