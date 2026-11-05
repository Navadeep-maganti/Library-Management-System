import React, { useState, useEffect, useCallback } from "react";
import LibrarianMobileDetailsModal from "../components/LibrarianMobileDetailsModal";
import "../styles/LibrarianIssueBookPage.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const LibrarianIssueBookPage = () => {
  // Issued-books registry state
  const [issuedRecords, setIssuedRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selectedRecordDetails, setSelectedRecordDetails] = useState(null);
  const [returnConfirmation, setReturnConfirmation] = useState(null);

  // Fetch all issued books from database
  const fetchIssuedBooks = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingRecords(true);
      const res = await fetch(`${API_BASE_URL}/api/issued-books`);
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
    const interval = setInterval(() => {
      fetchIssuedBooks(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchIssuedBooks]);

  // Handle Return Book
  const handleReturnBook = (id, title) => {
    setReturnConfirmation({ id, title });
  };

  const confirmReturnBook = async () => {
    const { id, title } = returnConfirmation;
    setReturnConfirmation(null);
    try {
      setActionLoading(id);
      setNotice(null);
      const res = await fetch(`${API_BASE_URL}/api/issued-books/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to return book.");
      }
      const fineMsg = data.fineGenerated ? ` (Overdue Fine: ₹${data.fineGenerated.amount})` : "";
      setNotice({ type: "success", text: `Book "${title}" returned successfully.${fineMsg}` });
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
      const res = await fetch(`${API_BASE_URL}/api/issued-books/${id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to renew book loan.");
      }
      setNotice({ type: "success", text: `Book "${title}" loan renewed for +7 days.` });
      await fetchIssuedBooks(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Could not renew book loan." });
    } finally {
      setActionLoading(null);
    }
  };

  // KPI counts
  const totalIssuedAllTime = issuedRecords.length;
  const activeLoansCount = issuedRecords.filter((r) => !r.isReturned).length;
  const returnedCount = issuedRecords.filter((r) => r.isReturned).length;
  const overdueCount = issuedRecords.filter(
    (r) => !r.isReturned && new Date(r.dueDate) < new Date()
  ).length;

  // Filtered records for registry table
  const filteredRecords = issuedRecords.filter((txn) => {
    const isOverdue = !txn.isReturned && new Date(txn.dueDate) < new Date();

    if (statusFilter === "active" && txn.isReturned) return false;
    if (statusFilter === "returned" && !txn.isReturned) return false;
    if (statusFilter === "overdue" && !isOverdue) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchesTxnId = `txn-${txn.id}`.toLowerCase().includes(q) || String(txn.id).includes(q);
      const matchesStudent =
        (txn.student.user.username || "").toLowerCase().includes(q) ||
        (txn.studentId || "").toLowerCase().includes(q) ||
        (txn.student.department || "").toLowerCase().includes(q);
      const matchesBook =
        (txn.book?.title || "").toLowerCase().includes(q) ||
        (txn.book?.author || "").toLowerCase().includes(q) ||
        (txn.book?.isbn || "").toLowerCase().includes(q);

      return matchesTxnId || matchesStudent || matchesBook;
    }

    return true;
  });

  return (
    <div className="issue-page-container">
      <LibrarianMobileDetailsModal item={selectedRecordDetails} onClose={() => setSelectedRecordDetails(null)} title={selectedRecordDetails?.book?.title || "Issued book"} subtitle={selectedRecordDetails && `Transaction #TXN-${String(selectedRecordDetails.id).padStart(4, "0")}`} status={selectedRecordDetails?.isReturned ? "Returned" : "In circulation"} fields={selectedRecordDetails ? [{ label: "Student", value: selectedRecordDetails.student.user.username }, { label: "Student ID", value: selectedRecordDetails.studentId }, { label: "Author", value: selectedRecordDetails.book?.author }, { label: "ISBN", value: selectedRecordDetails.book?.isbn }, { label: "Issued", value: new Date(selectedRecordDetails.issueDate).toLocaleString() }, { label: "Due", value: new Date(selectedRecordDetails.dueDate).toLocaleString() }, { label: "Returned", value: selectedRecordDetails.returnDate ? new Date(selectedRecordDetails.returnDate).toLocaleString() : "Not yet returned" }] : []} />
      {returnConfirmation && (
        <div className="return-confirmation-backdrop" onClick={() => setReturnConfirmation(null)} role="presentation">
          <section className="return-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="return-confirmation-title" onClick={(event) => event.stopPropagation()}>
            <div className="return-confirmation-icon">↩</div>
            <h2 id="return-confirmation-title">Confirm book return</h2>
            <p>Are you sure you want to mark <strong>{returnConfirmation.title || "this book"}</strong> as returned?</p>
            <div className="return-confirmation-actions">
              <button type="button" className="return-confirmation-cancel" onClick={() => setReturnConfirmation(null)}>Cancel</button>
              <button type="button" className="return-confirmation-submit" onClick={confirmReturnBook}>Confirm Return</button>
            </div>
          </section>
        </div>
      )}
      {/* Header Banner */}
      <header className="issue-header">
        <span className="issue-badge">Step 3 · Issued Books</span>
        <h2>Issued books registry</h2>
        <p>All books issued up to now, real-time loan tracking, returns, renewals, and circulation records.</p>
      </header>

      {/* Notice Message */}
      {notice && (
        <div className={`issued-notice-banner ${notice.type}`} role="alert">
          <span>{notice.type === "success" ? "" : ""}</span>
          <span>{notice.text}</span>
          <button type="button" className="issued-notice-close" onClick={() => setNotice(null)}></button>
        </div>
      )}

      <div className="issue-registry-wrapper">
          {/* Overview Metric Cards */}
          <div className="issued-metrics-grid">
            <div
              className={`issued-metric-card ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <span className="issued-metric-label">Total Issued Up to Now</span>
              <span className="issued-metric-val">{totalIssuedAllTime}</span>
            </div>

            <div
              className={`issued-metric-card ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              <span className="issued-metric-label">Currently Issued</span>
              <span className="issued-metric-val issued">{activeLoansCount}</span>
            </div>

            <div
              className={`issued-metric-card ${statusFilter === "overdue" ? "active" : ""}`}
              onClick={() => setStatusFilter("overdue")}
            >
              <span className="issued-metric-label">Overdue Loans</span>
              <span className="issued-metric-val low">{overdueCount}</span>
            </div>

            <div
              className={`issued-metric-card ${statusFilter === "returned" ? "active" : ""}`}
              onClick={() => setStatusFilter("returned")}
            >
              <span className="issued-metric-label">Returned to Catalog</span>
              <span className="issued-metric-val avail">{returnedCount}</span>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="issued-registry-card">
            {/* Search & Filter Toolbar */}
            <div className="issued-toolbar">
              <div className="issued-search-box">
                <span className="search-icon"></span>
                <input
                  type="text"
                  placeholder="Search by student name, roll number, book title, ISBN, or TXN ID..."
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

                  </button>
                )}
              </div>

              <div className="issued-filter-tabs">
                <button
                  type="button"
                  className={`filter-tab-btn ${statusFilter === "all" ? "active" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  All ({totalIssuedAllTime})
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
                <button
                  type="button"
                  className="issued-refresh-btn"
                  onClick={() => fetchIssuedBooks()}
                  disabled={loadingRecords}
                  title="Refresh records"
                  style={{ marginLeft: "4px" }}
                >
                  <span className={loadingRecords ? "spinning" : ""}></span> Refresh
                </button>
              </div>
            </div>

            {/* Table */}
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
                          <span className="spinning" style={{ fontSize: "1.5rem" }}></span>
                          <span>Loading issued book records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length > 0 ? (
                    filteredRecords.map((txn) => {
                      const isOverdue = !txn.isReturned && new Date(txn.dueDate) < new Date();
                      const statusClass = txn.isReturned ? "returned" : isOverdue ? "overdue" : "issued";
                      const statusLabel = txn.isReturned ? " Returned" : isOverdue ? " Overdue" : "● Active Loan";

                      const dueDateObj = new Date(txn.dueDate);
                      const issueDateObj = new Date(txn.issueDate);
                      const diffDays = Math.ceil((dueDateObj - new Date()) / (1000 * 60 * 60 * 24));

                      return (
                        <tr key={txn.id}>
                          <td className="txn-id">
                            <span className="txn-badge">#TXN-{String(txn.id).padStart(4, "0")}</span>
                          </td>
                          <td className="student-cell">
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              {txn.student.user.username || "Student"}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                              Roll: <strong style={{ color: "#334155" }}>{txn.studentId}</strong>
                            </div>
                            {txn.student.department && (
                              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                {txn.student.department}
                              </div>
                            )}
                          </td>
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
                          <td>
                            <div style={{ fontWeight: 600 }}>{issueDateObj.toLocaleDateString()}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {issueDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
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
                                {isOverdue ? `${Math.abs(diffDays)}d Overdue` : `${diffDays}d left`}
                              </div>
                            )}
                          </td>
                          <td>
                            {txn.returnDate ? (
                              <div>
                                <div style={{ fontWeight: 600, color: "#166534" }}>
                                  {new Date(txn.returnDate).toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  {new Date(txn.returnDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
                                In Circulation
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                            {txn.renewalCount > 0 && (
                              <span style={{ display: "block", fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                                Renewed {txn.renewalCount}x
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {!txn.isReturned ? (
                              <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                <button
                                  type="button"
                                  className="table-action-btn return"
                                  onClick={() => handleReturnBook(txn.id, txn.book?.title)}
                                  disabled={actionLoading === txn.id}
                                  title="Mark as returned"
                                >
                                  {actionLoading === txn.id ? "..." : " Return"}
                                </button>
                                <button
                                  type="button"
                                  className="table-action-btn renew"
                                  onClick={() => handleRenewBook(txn.id, txn.book?.title)}
                                  disabled={actionLoading === txn.id || txn.renewalCount >= 2}
                                  title={txn.renewalCount >= 2 ? "Max renewals" : "Renew +7d"}
                                >
                                  +7d
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>
                                 Returned
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
                          <span style={{ fontSize: "2rem" }}></span>
                          <strong style={{ fontSize: "1.05rem", color: "#334155" }}>
                            {searchTerm
                              ? `No issued books matched "${searchTerm}"`
                              : statusFilter !== "all"
                              ? `No issued books found for "${statusFilter}" filter`
                              : "No books currently issued up to now"}
                          </strong>
                          <p style={{ margin: 0, fontSize: "0.88rem", maxWidth: "450px" }}>
                            {searchTerm
                              ? "Try searching for a different roll number, student name, or book title."
                              : "No issuance records are available yet."}
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
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!loadingRecords && filteredRecords.length > 0 && <div className="librarian-mobile-records">{filteredRecords.map((txn) => <button type="button" className="librarian-mobile-record" key={txn.id} onClick={() => setSelectedRecordDetails(txn)}><strong>{txn.book?.title || "Book title unavailable"}</strong><span>{txn.student.user.username || txn.studentId} · {txn.isReturned ? "Returned" : "In circulation"}</span><em>›</em></button>)}</div>}
          </div>
        </div>
    </div>
  );
};

export default LibrarianIssueBookPage;
