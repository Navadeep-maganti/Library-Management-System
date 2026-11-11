import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../../../api";
import StudentLoadingOverlay from "../components/StudentLoadingOverlay";

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
          apiFetch("/api/announcements", { headers: authHeaders }),
          apiFetch(`/api/alerts?studentId=${encodeURIComponent(rollNo)}`, { headers: authHeaders })
        ]);
        const announcementData = await announcementResponse.json();
        const alertData = await alertResponse.json();
        if (!announcementResponse.ok) throw new Error(announcementData.message || "Could not load library updates.");
        if (!alertResponse.ok) throw new Error(alertData.message || "Could not load due-date alerts.");
        const latestAlerts = [
          ...(alertData.alerts || []).map((alert) => ({
            id: `${alert.type === "availability" ? "availability" : "due"}-${alert.id}`,
            alertId: alert.id,
            alertType: alert.type || "due",
            type: alert.type || "due",
            icon: "!",
            label: alert.type === "availability" ? "Availability alert" : "Due date reminder",
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
          }))
        ].sort((first, second) => new Date(second.receivedAt) - new Date(first.receivedAt)).slice(0, 20);
        setAlerts(latestAlerts);
      } catch (loadError) {
        showToast("error", loadError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();
  }, [currentUser, showToast]);
  const unreadCount = alerts.filter((alert) => alert.unread).length;

  return (
    <section className="student-info-panel student-loading-surface" aria-busy={isLoading}>
      <StudentLoadingOverlay active={isLoading} label="Loading your library alerts" />
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">LIBRARY UPDATES</p>
          <h2>Alerts <span className="heading-count">{unreadCount}</span></h2>
        </div>
      </div>
      <div className="alert-list">
        {isLoading ? <p className="empty-search">Loading library updates...</p> : alerts.length ? alerts.map((alert) => (
          <article className={`library-alert alert-${alert.type} ${alert.unread ? "alert-unread" : ""}`} key={alert.id}>
            <div className="library-alert-icon" aria-hidden="true">{alert.icon}</div>
            <div className="library-alert-copy"><span className="library-alert-label">{alert.label}</span><strong>{alert.title}</strong><span>{alert.detail}</span><time dateTime={alert.receivedAt}>Received {formatReceivedAt(alert.receivedAt)}</time></div>
          </article>
        )) : <p className="empty-search">You are all caught up.</p>}
      </div>
    </section>
  );
};

export default AlertsPage;
