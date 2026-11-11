import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api";
import { DEPARTMENTS, STUDY_YEARS } from "../../../constants/academicOptions";
import "../styles/LibrarianProfilePage.css";

const audienceOptions = [
  { value: "all", label: "All students" },
  { value: "department", label: "Specific department" },
  { value: "year", label: "Specific year" },
  { value: "overdue", label: "Students with overdue books" },
  { value: "reserved", label: "Students waiting for a reserved book" },
];
const emptyForm = { title: "", content: "", audienceType: "all", targetDepartment: "", targetYear: "", expiresAt: "" };

const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const formatExpiry = (value) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  return date.getTime() <= Date.now() ? `Expired ${date.toLocaleString()}` : `Expires ${date.toLocaleString()}`;
};

const LibrarianAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const authHeaders = { Authorization: `Bearer ${localStorage.getItem("libraryToken") || ""}` };

  const loadAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/announcements", { headers: authHeaders });
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
    setDepartments(DEPARTMENTS.map((name, id) => ({ id, name })));
  }, []);

  const saveAnnouncement = async (event) => {
    event.preventDefault();
    setPublishing(true);
    setError("");
    try {
      const response = await apiFetch(editingId ? `/api/announcements/${editingId}` : "/api/announcements", {
        method: editingId ? "PUT" : "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Could not save announcement.");
      setAlerts((current) => editingId
        ? current.map((alert) => alert.id === editingId ? data.announcement : alert)
        : [data.announcement, ...current]);
      setForm(emptyForm);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError.message || "Could not publish announcement.");
    } finally {
      setPublishing(false);
    }
  };

  const editAlert = (alert) => {
    setEditingId(alert.id);
    setForm({
      title: alert.title || "",
      content: alert.content || "",
      audienceType: alert.audienceType || "all",
      targetDepartment: alert.targetDepartment || "",
      targetYear: alert.targetYear || "",
      expiresAt: toDateTimeInput(alert.expiresAt),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const dismissAlert = async (id) => {
    setActionLoading(id);
    setError("");
    try {
      const response = await apiFetch(`/api/announcements/${id}`, { method: "DELETE", headers: authHeaders });
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
      const results = await Promise.all(alerts.map((alert) => apiFetch(`/api/announcements/${alert.id}`, { method: "DELETE", headers: authHeaders })));
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
      <form className="librarian-announcement-form" onSubmit={saveAnnouncement}>
        <div><p className="librarian-profile-kicker">{editingId ? "EDIT UPDATE" : "PUBLISH UPDATE"}</p><h2>Emergency and important alerts</h2></div>
        <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength="255" required placeholder="e.g. Extended exam-season hours" /></label>
        <label><span>Message</span><textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required placeholder="Share the details students need to know." rows="4" /></label>
        <div className="librarian-announcement-form-row">
          <label><span>Audience</span><select value={form.audienceType} onChange={(event) => setForm({ ...form, audienceType: event.target.value })}>{audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          {form.audienceType === "department" && <label><span>Department</span><select value={form.targetDepartment} onChange={(event) => setForm({ ...form, targetDepartment: event.target.value })} required><option value="">Select a department</option>{departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</select></label>}
          {form.audienceType === "year" && <label><span>Year</span><select value={form.targetYear} onChange={(event) => setForm({ ...form, targetYear: event.target.value })} required><option value="">Select a year</option>{STUDY_YEARS.map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>}
          <label><span>Expires (optional)</span><input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label>
        </div>
        <div className="librarian-announcement-form-actions"><button className="librarian-profile-edit-button" type="submit" disabled={publishing}>{publishing ? "Saving..." : editingId ? "Save changes" : "Publish announcement"}</button>{editingId && <button className="librarian-profile-edit-button librarian-announcement-cancel" type="button" onClick={cancelEdit} disabled={publishing}>Cancel</button>}</div>
      </form>
      <div className="librarian-profile-heading"><div><p className="librarian-profile-kicker">LIBRARY UPDATES</p><h1>Alerts <span className="librarian-alert-count">{alerts.length}</span></h1></div><div className="librarian-alert-actions"><button type="button" className="librarian-profile-edit-button" onClick={loadAlerts} disabled={loading || actionLoading !== null}>Refresh</button><button type="button" className="librarian-profile-edit-button" onClick={clearAlerts} disabled={!alerts.length || actionLoading !== null}>{actionLoading === "all" ? "Clearing..." : "Clear all"}</button></div></div>
      {error && <p className="librarian-profile-page-notice librarian-profile-page-error" role="alert">{error}</p>}
      {loading ? <p>Loading library updates...</p> : alerts.length ? <div className="librarian-alert-list">{alerts.map((alert) => <article className="librarian-alert-card" key={alert.id}><span className="librarian-alert-icon">i</span><div><small>{audienceOptions.find((option) => option.value === alert.audienceType)?.label || "LIBRARY ANNOUNCEMENT"}</small><h3>{alert.title}</h3><p>{alert.content}</p><time>{new Date(alert.createdAt).toLocaleString()} · {formatExpiry(alert.expiresAt)}</time></div><div className="librarian-alert-card-actions"><button type="button" disabled={actionLoading !== null} onClick={() => editAlert(alert)}>Edit</button><button type="button" disabled={actionLoading !== null} onClick={() => dismissAlert(alert.id)}>{actionLoading === alert.id ? "Deleting..." : "Delete"}</button></div></article>)}</div> : <p>No announcements have been published.</p>}
    </section>
  );
};

export default LibrarianAlertsPage;
