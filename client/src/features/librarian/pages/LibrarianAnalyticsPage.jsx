import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api";
import "../styles/LibrarianAnalyticsPage.css";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "Not computed yet";

const MetricList = ({ items, emptyMessage, renderItem }) => (
  items?.length ? <div className="analytics-list">{items.map(renderItem)}</div> : <p className="analytics-empty">{emptyMessage}</p>
);

const LibrarianAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await apiFetch("/api/analytics", {
          headers: { Authorization: `Bearer ${localStorage.getItem("libraryToken") || ""}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.message || "Could not load analytics.");
        setAnalytics(data.analytics);
      } catch (requestError) {
        setError(requestError.message || "Could not load analytics.");
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) return <section className="librarian-analytics-page"><p>Loading library analytics...</p></section>;
  if (error) return <section className="librarian-analytics-page"><p className="analytics-error" role="alert">{error}</p></section>;

  return (
    <section className="librarian-analytics-page">
      <header className="analytics-heading">
        <div><p className="librarian-profile-kicker">LIBRARY INTELLIGENCE</p><h1>Occupancy and Demand Analytics</h1><p>Cached insights help the library team plan stock and services without recalculating on every refresh.</p></div>
        <div className="analytics-updated">Snapshot updated<br /><strong>{formatDate(analytics?.updatedAt)}</strong></div>
      </header>
      <div className="analytics-grid">
        <article className="analytics-card"><h2>Most borrowed books</h2><MetricList items={analytics?.mostBorrowed} emptyMessage="No borrowing history yet." renderItem={(item, index) => <div className="analytics-row" key={item.bookId}><b>#{index + 1} {item.title}</b><span>{item.borrowCount} borrows</span></div>} /></article>
        <article className="analytics-card"><h2>Most active departments</h2><MetricList items={analytics?.activeDepartments} emptyMessage="No department activity yet." renderItem={(item, index) => <div className="analytics-row" key={item.department}><b>#{index + 1} {item.department}</b><span>{item.borrowCount} borrows</span></div>} /></article>
        <article className="analytics-card"><h2>Most unavailable books</h2><p className="analytics-help">Based on students who enabled availability alerts.</p><MetricList items={analytics?.unavailableBooks} emptyMessage="No availability alerts enabled yet." renderItem={(item) => <div className="analytics-row" key={item.bookId}><b>{item.title}</b><span>{item.alertSubscribers} waiting</span></div>} /></article>
        <article className="analytics-card"><h2>Predicted high-demand books</h2><p className="analytics-help">Score combines borrowing activity and availability-alert demand.</p><MetricList items={analytics?.predictedHighDemand} emptyMessage="No demand prediction yet." renderItem={(item) => <div className="analytics-row" key={item.bookId}><b>{item.title}</b><span>Score {item.demandScore}</span></div>} /></article>
        <article className="analytics-card analytics-card-wide"><h2>Monthly borrowing trends</h2><MetricList items={analytics?.monthlyTrends} emptyMessage="No monthly borrowing history yet." renderItem={(item) => <div className="analytics-row" key={item.month}><b>{item.month}</b><span>{item.borrowCount} borrows</span></div>} /><small>Monthly trend snapshot: {formatDate(analytics?.lastMonthlyRefreshAt)}</small></article>
      </div>
    </section>
  );
};

export default LibrarianAnalyticsPage;
