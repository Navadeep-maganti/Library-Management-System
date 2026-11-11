import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api";
import "../styles/LibrarianAnalyticsPage.css";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "Not computed yet";
const getMax = (items, key) => Math.max(...(items || []).map((item) => Number(item[key]) || 0), 1);
const formatMonth = (value) => {
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { month: "short", year: "2-digit" });
};

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

  const mostBorrowed = analytics?.mostBorrowed || [];
  const departments = analytics?.activeDepartments || [];
  const unavailable = analytics?.unavailableBooks || [];
  const predicted = analytics?.predictedHighDemand || [];
  const trends = analytics?.monthlyTrends || [];
  const totalBorrows = trends.reduce((sum, item) => sum + item.borrowCount, 0);

  return (
    <section className="librarian-analytics-page">
      <header className="analytics-heading">
        <div><p className="librarian-profile-kicker">LIBRARY INTELLIGENCE</p><h1>Occupancy and Demand Analytics</h1><p>Cached insights help the library team plan stock and services without recalculating on every refresh.</p></div>
        <div className="analytics-updated">Snapshot updated<br /><strong>{formatDate(analytics?.updatedAt)}</strong></div>
      </header>
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi"><span className="analytics-kpi-icon">↗</span><div><strong>{totalBorrows}</strong><span>Recorded borrows</span></div></div>
        <div className="analytics-kpi"><span className="analytics-kpi-icon blue">▥</span><div><strong>{mostBorrowed.length}</strong><span>Top books tracked</span></div></div>
        <div className="analytics-kpi"><span className="analytics-kpi-icon amber">!</span><div><strong>{unavailable.reduce((sum, item) => sum + item.alertSubscribers, 0)}</strong><span>Students waiting</span></div></div>
        <div className="analytics-kpi"><span className="analytics-kpi-icon purple">◈</span><div><strong>{predicted.length}</strong><span>Demand signals</span></div></div>
      </div>
      <div className="analytics-grid">
        <article className="analytics-card analytics-card-wide trend-card">
          <div className="analytics-card-heading"><div><h2>Monthly borrowing trends</h2><p className="analytics-help">Borrowing activity across the last 12 recorded months.</p></div><span className="analytics-chart-legend"><i /> Borrows</span></div>
          {trends.length ? <div className="analytics-chart" aria-label="Monthly borrowing trend bar chart">{trends.map((item) => <div className="analytics-bar-group" key={item.month}><span className="analytics-bar-value">{item.borrowCount}</span><div className="analytics-bar-track"><div className="analytics-bar" style={{ height: `${Math.max(8, (item.borrowCount / getMax(trends, "borrowCount")) * 100)}%` }} /></div><span className="analytics-bar-label">{formatMonth(item.month)}</span></div>)}</div> : <p className="analytics-empty">No monthly borrowing history yet.</p>}
          <small>Monthly trend snapshot: {formatDate(analytics?.lastMonthlyRefreshAt)}</small>
        </article>
        <article className="analytics-card"><div className="analytics-card-heading"><h2>Most borrowed books</h2><span className="analytics-section-badge">TOP 10</span></div><MetricList items={mostBorrowed} emptyMessage="No borrowing history yet." renderItem={(item, index) => <div className="analytics-ranked-row" key={item.bookId}><span className="analytics-rank">{index + 1}</span><div className="analytics-row-main"><b>{item.title}</b><div className="analytics-progress"><i style={{ width: `${(item.borrowCount / getMax(mostBorrowed, "borrowCount")) * 100}%` }} /></div></div><strong>{item.borrowCount}</strong></div>} /></article>
        <article className="analytics-card"><div className="analytics-card-heading"><h2>Most active departments</h2><span className="analytics-section-badge blue-badge">ACTIVITY</span></div><MetricList items={departments} emptyMessage="No department activity yet." renderItem={(item, index) => <div className="analytics-ranked-row" key={item.department}><span className="analytics-rank blue-rank">{index + 1}</span><div className="analytics-row-main"><b>{item.department}</b><div className="analytics-progress blue-progress"><i style={{ width: `${(item.borrowCount / getMax(departments, "borrowCount")) * 100}%` }} /></div></div><strong>{item.borrowCount}</strong></div>} /></article>
        <article className="analytics-card"><div className="analytics-card-heading"><h2>Most unavailable books</h2><span className="analytics-section-badge amber-badge">DEMAND</span></div><p className="analytics-help">Students waiting for availability alerts.</p><MetricList items={unavailable} emptyMessage="No availability alerts enabled yet." renderItem={(item) => <div className="analytics-row" key={item.bookId}><b>{item.title}</b><span>{item.alertSubscribers} waiting</span></div>} /></article>
        <article className="analytics-card"><div className="analytics-card-heading"><h2>Predicted high-demand</h2><span className="analytics-section-badge purple-badge">FORECAST</span></div><p className="analytics-help">Combined borrowing and alert demand score.</p><MetricList items={predicted} emptyMessage="No demand prediction yet." renderItem={(item) => <div className="analytics-row" key={item.bookId}><b>{item.title}</b><span>Score {item.demandScore}</span></div>} /></article>
      </div>
    </section>
  );
};

export default LibrarianAnalyticsPage;
