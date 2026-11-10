import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../../../api";

const formatReceivedAt = (value) => new Date(value).toLocaleString([], {
  dateStyle: "medium",
  timeStyle: "short",
});

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, showToast } = useOutletContext();
  const authHeaders = { Authorization: `Bearer ${localStorage.getItem("libraryToken") || ""}` };

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const rollNo = currentUser.roll_no || currentUser.rollNo || currentUser.studentId;
        const [announcementResponse, alertResponse] = await Promise.all([
          apiFetch("/api/announcements"),
          apiFetch(`/api/alerts?studentId=${encodeURIComponent(rollNo)}`, { headers: authHeaders })
        ]);
        const announcementData = await announcementResponse.json();
        const alertData = await alertResponse.json();
        if (!announcementResponse.ok) throw new Error(announcementData.message || "Could not load library updates.");
        if (!alertResponse.ok) throw new Error(alertData.message || "Could not load due-date alerts.");
        setAlerts([
          ...(alertData.alerts || []).map((alert) => ({
            id: `due-${alert.id}`,
            alertId: alert.id,
            type: "due",
            icon: "!",
            label: "DUE DATE REMINDER",
            title: alert.title,
            detail: alert.content,
            receivedAt: alert.createdAt,
            unread: !alert.readAt,
          })),
          ...(announcementData.announcements || []).map((announcement) => ({
          id: announcement.id,
          type: "announcement",
          icon: "i",
          label: "LIBRARY ANNOUNCEMENT",
          title: announcement.title,
          detail: announcement.content,
          receivedAt: announcement.createdAt,
          unread: true,
          }))]
        );
      } catch (loadError) {
        showToast("error", loadError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();
  }, [currentUser, showToast]);
  const unreadCount = alerts.filter((alert) => alert.unread).length;

  const markAllRead = async () => {
    const unreadAlerts = alerts.filter((alert) => alert.unread && alert.alertId);
    try {
      await Promise.all(unreadAlerts.map((alert) => apiFetch(`/api/alerts/${alert.alertId}/read`, { method: "POST", headers: authHeaders })));
      setAlerts((current) => current.map((alert) => ({ ...alert, unread: false })));
    } catch (error) {
      showToast("error", error.message || "Could not mark alerts as read.");
    }
  };

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
        {isLoading ? <p className="empty-search">Loading library updates...</p> : alerts.length ? alerts.map((alert) => (
          <article className={`library-alert alert-${alert.type} ${alert.unread ? "alert-unread" : ""}`} key={alert.id}>
            <div className="library-alert-icon" aria-hidden="true">{alert.icon}</div>
            <div className="library-alert-copy"><span className="library-alert-label">{alert.label}</span><strong>{alert.title}</strong><span>{alert.detail}</span><time dateTime={alert.receivedAt}>Received {formatReceivedAt(alert.receivedAt)}</time></div>
            <button className="icon-text-button" type="button" onClick={async () => {
              if (alert.alertId && alert.unread) await apiFetch(`/api/alerts/${alert.alertId}/read`, { method: "POST", headers: authHeaders });
              setAlerts((current) => current.filter((item) => item.id !== alert.id));
            }}>Dismiss</button>
          </article>
        )) : <p className="empty-search">You are all caught up.</p>}
      </div>
    </section>
  );
};

export default AlertsPage;
