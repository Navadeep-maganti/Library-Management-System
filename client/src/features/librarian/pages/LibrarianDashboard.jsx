import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/LibrarianDashboard.css";

const LibrarianDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [issuedRecords, setIssuedRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);
  const [notice, setNotice] = useState(null);

  const currentUser =
    user ||
    (() => {
      try {
        const stored = localStorage.getItem("libraryUser");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();

  useEffect(() => {
    if (!currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  // Fetch all issued books from database
  const fetchIssuedBooks = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingRecords(true);
      const res = await fetch("/api/issued-books");
      const data = await res.json();
      if (data.success && Array.isArray(data.issuedBooks)) {
        setIssuedRecords(data.issuedBooks);
      }
    } catch (err) {
      console.error("Error fetching issued books:", err);
    } finally {
      if (!isSilent) setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchIssuedBooks();
    // Auto-refresh every 20 seconds to keep issued books synchronized
    const interval = setInterval(() => {
      fetchIssuedBooks(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchIssuedBooks]);

  // Handle Mark as Returned
  const handleReturnBook = async (id, title) => {
    if (!window.confirm(`Confirm return for "${title || 'this book'}"?`)) return;
    try {
      setActionLoading(id);
      setNotice(null);
      const res = await fetch(`/api/issued-books/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to return book.");
      }
      const fineMsg = data.fineGenerated ? ` (Overdue Fine Generated: ₹${data.fineGenerated.amount})` : "";
      setNotice({ type: "success", text: `Book "${title}" marked as returned successfully.${fineMsg}` });
      await fetchIssuedBooks(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Could not process book return." });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Renew Book
  const handleRenewBook = async (id, title) => {
    try {
      setActionLoading(id);
      setNotice(null);
      const res = await fetch(`/api/issued-books/${id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to renew book loan.");
      }
      setNotice({ type: "success", text: `Book "${title}" loan renewed successfully by 7 days.` });
      await fetchIssuedBooks(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Could not renew book loan." });
    } finally {
      setActionLoading(null);
    }
  };

  // Computed summary counts
  const totalIssuedAllTime = issuedRecords.length;
  const activeLoansCount = issuedRecords.filter((r) => !r.isReturned).length;
  const returnedCount = issuedRecords.filter((r) => r.isReturned).length;
  const overdueCount = issuedRecords.filter(
    (r) => !r.isReturned && new Date(r.dueDate) < new Date()
  ).length;

  // Filtered records
  const filteredRecords = issuedRecords.filter((txn) => {
    const isOverdue = !txn.isReturned && new Date(txn.dueDate) < new Date();

    // Status filter
    if (statusFilter === "active" && txn.isReturned) return false;
    if (statusFilter === "returned" && !txn.isReturned) return false;
    if (statusFilter === "overdue" && !isOverdue) return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchesTxnId = `txn-${txn.id}`.toLowerCase().includes(q) || String(txn.id).includes(q);
      const matchesStudent =
        (txn.student?.user?.username || "").toLowerCase().includes(q) ||
        (txn.studentId || "").toLowerCase().includes(q) ||
        (txn.student?.department || "").toLowerCase().includes(q);
      const matchesBook =
        (txn.book?.title || "").toLowerCase().includes(q) ||
        (txn.book?.author || "").toLowerCase().includes(q) ||
        (txn.book?.isbn || "").toLowerCase().includes(q);

      return matchesTxnId || matchesStudent || matchesBook;
    }

    return true;
  });

  if (!currentUser) {
    return null;
  }

  return (
    <div className="librarian-dashboard-shell">
      {/* Hero Header Section */}
      <section className="librarian-hero-section">
        <div className="librarian-hero-badge">
          <span className="librarian-hero-badge-dot"></span>
          Central Library • Staff Operations Hub
        </div>
        <h1 className="librarian-hero-title">
          Welcome back, <span className="librarian-gradient-text">{currentUser?.username || "Librarian"}</span>
        </h1>
        <p className="librarian-hero-subtitle">
          Manage circulation, verify student authorization OTP tokens, issue physical books, and keep library stock synchronized in real time.
        </p>
      </section>

      {/* Staff Profile Overview / Stats Grid */}
      <section className="librarian-stats-grid">
        <div className="librarian-stat-card">
          <span className="librarian-stat-label">Staff Administrator</span>
          <span className="librarian-stat-value">{currentUser?.username || "Librarian Staff"}</span>
          <div className="librarian-stat-badge">Active Session</div>
        </div>

        <div className="librarian-stat-card">
          <span className="librarian-stat-label">Staff ID</span>
          <span className="librarian-stat-value">{currentUser?.staff_id || "LIB-STAFF-01"}</span>
          <div className="librarian-stat-badge">Verified ID</div>
        </div>

        <div className="librarian-stat-card">
          <span className="librarian-stat-label">Authorized Role</span>
          <span className="librarian-stat-value">Librarian</span>
          <div className="librarian-stat-badge">Full Privileges</div>
        </div>

        <div className="librarian-stat-card">
          <span className="librarian-stat-label">Official Email</span>
          <span className="librarian-stat-value" style={{ fontSize: "1.05rem" }}>
            {currentUser?.email || "staff@nitandhra.ac.in"}
          </span>
          <div className="librarian-stat-badge">Domain Authenticated</div>
        </div>
      </section>

      {/* Librarian Operations Workflow */}
      <section className="librarian-section">
        <div className="librarian-section-header">
          <h2 className="librarian-section-title">Librarian Operations Workflow</h2>
          <p className="librarian-section-subtitle">
            Follow the 4-step structured workflow for processing student requests and circulation:
          </p>
        </div>

        <div className="librarian-flow-grid">
          <Link to="/librarian/reservations" className="librarian-flow-card">
            <span className="librarian-flow-step-tag">Step 1</span>
            <div className="librarian-flow-icon">📋</div>
            <h3 className="librarian-flow-title">View Requests</h3>
            <p className="librarian-flow-desc">Review pending book bookings requested by students.</p>
            <span className="librarian-flow-btn">Open Requests &rarr;</span>
          </Link>

          <Link to="/librarian/verify-token" className="librarian-flow-card">
            <span className="librarian-flow-step-tag">Step 2</span>
            <div className="librarian-flow-icon">🔑</div>
            <h3 className="librarian-flow-title">Verify Token</h3>
            <p className="librarian-flow-desc">Scan or manually enter student reservation OTP code.</p>
            <span className="librarian-flow-btn">Validate OTP &rarr;</span>
          </Link>

          <Link to="/librarian/issue-book" className="librarian-flow-card">
            <span className="librarian-flow-step-tag">Step 3</span>
            <div className="librarian-flow-icon">📖</div>
            <h3 className="librarian-flow-title">Issue Book</h3>
            <p className="librarian-flow-desc">Assign physical volume & configure return due date.</p>
            <span className="librarian-flow-btn">Issue Book &rarr;</span>
          </Link>

          <Link to="/librarian/update-stock" className="librarian-flow-card">
            <span className="librarian-flow-step-tag">Step 4</span>
            <div className="librarian-flow-icon">📦</div>
            <h3 className="librarian-flow-title">Update Stock</h3>
            <p className="librarian-flow-desc">Synchronize physical catalog inventory & stock levels.</p>
            <span className="librarian-flow-btn">Catalog Stock &rarr;</span>
          </Link>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <section className="librarian-actions-box">
        <div className="librarian-section-header" style={{ marginBottom: "16px" }}>
          <h3 className="librarian-section-title" style={{ fontSize: "1.2rem" }}>Quick Actions</h3>
          <p className="librarian-section-subtitle">Direct shortcuts to frequent staff operations</p>
        </div>
        <div className="librarian-actions-row">
          <button type="button" className="librarian-btn-primary" onClick={() => navigate("/librarian/issue-book")}>
            <span>📖</span> Issue New Book
          </button>
          <button type="button" className="librarian-btn-secondary" onClick={() => navigate("/librarian/verify-token")}>
            <span>🔑</span> Verify Student OTP
          </button>
          <button type="button" className="librarian-btn-secondary" onClick={() => navigate("/librarian/reservations")}>
            <span>📋</span> View Pending Requests
          </button>
          <button type="button" className="librarian-btn-secondary" onClick={() => navigate("/librarian/update-stock")}>
            <span>📦</span> Update Inventory
          </button>
        </div>
      </section>

      {/* ISSUED BOOKS SECTION - ALL BOOKS ISSUED UP TO NOW */}
      <section className="librarian-table-card issued-books-section" id="issued-books-section">
        {/* Section Title & Header */}
        <div className="librarian-table-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <h2 className="librarian-section-title" style={{ fontSize: "1.35rem" }}>
                📚 Issued Books Records
              </h2>
              <span className="circulation-live-badge">
                <span className="circulation-pulse-dot"></span> Live Registry
              </span>
            </div>
            <p className="librarian-section-subtitle">
              All books that have been issued up to now in the library management system
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="issued-refresh-btn"
              onClick={() => fetchIssuedBooks()}
              disabled={loadingRecords}
              title="Refresh all issued book records"
            >
              <span className={loadingRecords ? "spinning" : ""}>🔄</span> Refresh
            </button>
            <button
              type="button"
              className="librarian-btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
              onClick={() => navigate("/librarian/issue-book")}
            >
              + Issue Book
            </button>
          </div>
        </div>

        {/* Notice Message */}
        {notice && (
          <div className={`issued-notice-banner ${notice.type}`} role="alert">
            <span>{notice.type === "success" ? "✓" : "⚠️"}</span>
            <span>{notice.text}</span>
            <button type="button" className="issued-notice-close" onClick={() => setNotice(null)}>✕</button>
          </div>
        )}

        {/* Issued Books Overview Metric Chips */}
        <div className="issued-metrics-grid">
          <div
            className={`issued-metric-chip ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <div className="metric-chip-icon all">📚</div>
            <div className="metric-chip-content">
              <span className="metric-chip-label">Total Issued (Up to Now)</span>
              <span className="metric-chip-count">{totalIssuedAllTime}</span>
            </div>
          </div>

          <div
            className={`issued-metric-chip ${statusFilter === "active" ? "active" : ""}`}
            onClick={() => setStatusFilter("active")}
          >
            <div className="metric-chip-icon active">📖</div>
            <div className="metric-chip-content">
              <span className="metric-chip-label">Currently Issued</span>
              <span className="metric-chip-count">{activeLoansCount}</span>
            </div>
          </div>

          <div
            className={`issued-metric-chip ${statusFilter === "overdue" ? "active" : ""}`}
            onClick={() => setStatusFilter("overdue")}
          >
            <div className="metric-chip-icon overdue">⚠️</div>
            <div className="metric-chip-content">
              <span className="metric-chip-label">Overdue Loans</span>
              <span className="metric-chip-count">{overdueCount}</span>
            </div>
          </div>

          <div
            className={`issued-metric-chip ${statusFilter === "returned" ? "active" : ""}`}
            onClick={() => setStatusFilter("returned")}
          >
            <div className="metric-chip-icon returned">✓</div>
            <div className="metric-chip-content">
              <span className="metric-chip-label">Returned Books</span>
              <span className="metric-chip-count">{returnedCount}</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="issued-toolbar">
          <div className="issued-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by student name, roll no, book title, ISBN, or TXN ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="issued-search-input"
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

          <div className="issued-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All Issued ({totalIssuedAllTime})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active Loans ({activeLoansCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "overdue" ? "active" : ""}`}
              onClick={() => setStatusFilter("overdue")}
            >
              Overdue ({overdueCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${statusFilter === "returned" ? "active" : ""}`}
              onClick={() => setStatusFilter("returned")}
            >
              Returned ({returnedCount})
            </button>
          </div>
        </div>

        {/* Issued Books Table */}
        <div className="librarian-table-wrapper">
          <table className="librarian-table">
            <thead>
              <tr>
                <th>TXN ID</th>
                <th>Student Details</th>
                <th>Issued Book</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <span className="spinning" style={{ fontSize: "1.5rem" }}>🔄</span>
                      <span>Loading all issued book records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((txn) => {
                  const isOverdue = !txn.isReturned && new Date(txn.dueDate) < new Date();
                  const statusClass = txn.isReturned ? "returned" : isOverdue ? "overdue" : "issued";
                  const statusLabel = txn.isReturned ? "✓ Returned" : isOverdue ? "⚠ Overdue" : "● Active Loan";

                  const dueDateObj = new Date(txn.dueDate);
                  const issueDateObj = new Date(txn.issueDate);
                  const diffDays = Math.ceil((dueDateObj - new Date()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={txn.id}>
                      {/* TXN ID */}
                      <td className="txn-id">
                        <span className="txn-badge">#TXN-{String(txn.id).padStart(4, "0")}</span>
                      </td>

                      {/* Student */}
                      <td className="student-cell">
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {txn.student?.user?.username || "Student"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          Roll: <strong style={{ color: "#334155" }}>{txn.studentId}</strong>
                        </div>
                        {txn.student?.department && (
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                            Dept: {txn.student.department}
                          </div>
                        )}
                      </td>

                      {/* Book */}
                      <td className="book-cell">
                        <div style={{ fontWeight: 700, color: "#0f172a", maxWidth: "260px" }}>
                          {txn.book?.title || "Book Title Unavailable"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          By {txn.book?.author || "Unknown Author"}
                        </div>
                        {txn.book?.isbn && (
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "monospace" }}>
                            ISBN: {txn.book.isbn}
                          </div>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td>
                        <div style={{ fontWeight: 600 }}>{issueDateObj.toLocaleDateString()}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {issueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td>
                        <div style={{ fontWeight: 600, color: isOverdue ? "#dc2626" : "inherit" }}>
                          {dueDateObj.toLocaleDateString()}
                        </div>
                        {!txn.isReturned && (
                          <div
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: isOverdue ? "#dc2626" : diffDays <= 3 ? "#d97706" : "#16a34a",
                            }}
                          >
                            {isOverdue ? `${Math.abs(diffDays)}d Overdue` : `${diffDays}d remaining`}
                          </div>
                        )}
                      </td>

                      {/* Return Date */}
                      <td>
                        {txn.returnDate ? (
                          <div>
                            <div style={{ fontWeight: 600, color: "#166534" }}>
                              {new Date(txn.returnDate).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {new Date(txn.returnDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
                            In Circulation
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                        {txn.renewalCount > 0 && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "0.7rem",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            Renewed: {txn.renewalCount}x
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "center" }}>
                        {!txn.isReturned ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              type="button"
                              className="table-action-btn return"
                              onClick={() => handleReturnBook(txn.id, txn.book?.title)}
                              disabled={actionLoading === txn.id}
                              title="Mark this book as returned"
                            >
                              {actionLoading === txn.id ? "Processing..." : "✓ Return"}
                            </button>
                            <button
                              type="button"
                              className="table-action-btn renew"
                              onClick={() => handleRenewBook(txn.id, txn.book?.title)}
                              disabled={actionLoading === txn.id || txn.renewalCount >= 2}
                              title={txn.renewalCount >= 2 ? "Max renewals reached" : "Renew loan for +7 days"}
                            >
                              +7d
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>
                            ✓ Closed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "2rem" }}>📭</span>
                      <strong style={{ fontSize: "1.05rem", color: "#334155" }}>
                        {searchTerm
                          ? `No issued books matched "${searchTerm}"`
                          : statusFilter !== "all"
                          ? `No issued books found for "${statusFilter}" filter`
                          : "No books currently issued up to now"}
                      </strong>
                      <p style={{ margin: 0, fontSize: "0.88rem", maxWidth: "450px" }}>
                        {searchTerm
                          ? "Try searching for a different roll number, book title, or author name."
                          : "Issue physical books to students using Step 3 (Issue Book) or by verifying student OTP tokens."}
                      </p>
                      {searchTerm ? (
                        <button
                          type="button"
                          className="librarian-btn-secondary"
                          style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                          onClick={() => setSearchTerm("")}
                        >
                          Clear Search
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="librarian-btn-primary"
                          style={{ padding: "8px 18px", fontSize: "0.85rem", marginTop: "6px" }}
                          onClick={() => navigate("/librarian/issue-book")}
                        >
                          📖 Issue First Book
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Staff Operational Guidelines Banner */}
      <section className="librarian-guidelines-box">
        <div className="librarian-guideline-item">
          <span className="librarian-guideline-icon">🔐</span>
          <div>
            <h4 className="librarian-guideline-title">OTP Token Validation</h4>
            <p className="librarian-guideline-desc">
              Always verify the student's 6-digit OTP code before physically handing over library materials.
            </p>
          </div>
        </div>

        <div className="librarian-guideline-item">
          <span className="librarian-guideline-icon">⚡</span>
          <div>
            <h4 className="librarian-guideline-title">Instant Inventory Sync</h4>
            <p className="librarian-guideline-desc">
              Catalog stock counts auto-update upon issue or return to maintain accurate real-time inventory.
            </p>
          </div>
        </div>

        <div className="librarian-guideline-item">
          <span className="librarian-guideline-icon">🛡️</span>
          <div>
            <h4 className="librarian-guideline-title">Due Date Enforcement</h4>
            <p className="librarian-guideline-desc">
              Standard loan periods are 14 calendar days. System flags overdue loans automatically.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LibrarianDashboard;
