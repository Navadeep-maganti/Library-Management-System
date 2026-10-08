import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/LibrarianIssueBookPage.css";

const LibrarianIssueBookPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab: 'registry' (All Issued Books) or 'issue' (Issue New Book Form)
  const initialTab = searchParams.get("tab") === "issue" || searchParams.get("book") ? "issue" : "registry";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Form states
  const initialStudent = searchParams.get("student") || "";
  const initialRoll = searchParams.get("roll") || "";
  const initialBook = searchParams.get("book") || "";

  const [studentName, setStudentName] = useState(initialStudent);
  const [rollNo, setRollNo] = useState(initialRoll);
  const [selectedBook, setSelectedBook] = useState(initialBook);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [issuedSuccess, setIssuedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [createdTxn, setCreatedTxn] = useState(null);

  // Registry states
  const [issuedRecords, setIssuedRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);
  const [notice, setNotice] = useState(null);

  // Fetch available books for dropdown
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const res = await fetch("/api/books?limit=all");
        const data = await res.json();
        if (data.success && Array.isArray(data.books)) {
          setAvailableBooks(data.books);
        }
      } catch (e) {
        console.error("Could not fetch books for issue list:", e);
      }
    };
    loadBooks();
  }, []);

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
    const interval = setInterval(() => {
      fetchIssuedBooks(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchIssuedBooks]);

  // Handle Return Book
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
      const res = await fetch(`/api/issued-books/${id}/renew`, {
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

  // Handle Issue Book form submit
  const handleIssueBook = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const matchedBook = availableBooks.find(
      (b) =>
        b.title.trim().toLowerCase() === selectedBook.trim().toLowerCase() ||
        String(b.id) === String(selectedBook)
    );

    if (!matchedBook) {
      setErrorMsg("Please select a valid book from the available catalog list.");
      return;
    }

    if (!rollNo.trim()) {
      setErrorMsg("Please enter the student roll number.");
      return;
    }

    try {
      setFormLoading(true);
      const res = await fetch("/api/issued-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: rollNo.trim(),
          bookId: matchedBook.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to issue book.");
      }

      setCreatedTxn(data.issuedBook);
      setIssuedSuccess(true);
      fetchIssuedBooks(true);
    } catch (err) {
      setErrorMsg(err.message || "An error occurred while issuing the book.");
    } finally {
      setFormLoading(false);
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

  return (
    <div className="issue-page-container">
      {/* Header Banner */}
      <header className="issue-header">
        <span className="issue-badge">Step 3 · Issued Books</span>
        <h2>Issued books registry</h2>
        <p>All books issued up to now, real-time loan tracking, returns, renewals, and circulation records.</p>
      </header>

      {/* Notice Message */}
      {notice && (
        <div className={`issued-notice-banner ${notice.type}`} role="alert">
          <span>{notice.type === "success" ? "✓" : "⚠️"}</span>
          <span>{notice.text}</span>
          <button type="button" className="issued-notice-close" onClick={() => setNotice(null)}>✕</button>
        </div>
      )}

      {/* VIEW 1: ALL ISSUED BOOKS REGISTRY */}
      {activeTab === "registry" && (
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
                <span className="search-icon">🔍</span>
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
                  <span className={loadingRecords ? "spinning" : ""}>🔄</span> Refresh
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
                          <span className="spinning" style={{ fontSize: "1.5rem" }}>🔄</span>
                          <span>Loading issued book records...</span>
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
                          <td className="txn-id">
                            <span className="txn-badge">#TXN-{String(txn.id).padStart(4, "0")}</span>
                          </td>
                          <td className="student-cell">
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              {txn.student?.user?.username || "Student"}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                              Roll: <strong style={{ color: "#334155" }}>{txn.studentId}</strong>
                            </div>
                            {txn.student?.department && (
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
                                  {actionLoading === txn.id ? "..." : "✓ Return"}
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
                                ✓ Returned
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
                              ? "Try searching for a different roll number, student name, or book title."
                              : "Click '+ Issue New Book' above to create a new issuance record."}
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
                              onClick={() => {
                                setActiveTab("issue");
                                setIssuedSuccess(false);
                              }}
                            >
                              ➕ Issue First Book
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ISSUE NEW BOOK FORM */}
      {activeTab === "issue" && (
        <div className="issue-card">
          {!issuedSuccess ? (
            <form onSubmit={handleIssueBook} className="issue-form">
              <div style={{ marginBottom: "6px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#0f172a" }}>Issue Book to Student</h3>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>Assign a physical volume and set due return date.</p>
              </div>

              <div className="issue-form-group">
                <label htmlFor="student-name" className="issue-form-label">
                  Student Name
                </label>
                <input
                  id="student-name"
                  type="text"
                  className="issue-input"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="issue-form-group">
                <label htmlFor="roll-no" className="issue-form-label">
                  Student Roll Number (Unique ID)
                </label>
                <input
                  id="roll-no"
                  type="text"
                  className="issue-input"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. 421101 or roll number in system"
                  required
                />
              </div>

              <div className="issue-form-group">
                <label htmlFor="select-book" className="issue-form-label">
                  Select Book from Catalog
                </label>
                <input
                  id="select-book"
                  type="text"
                  list="books-datalist"
                  className="issue-input"
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  placeholder="Type to search book title..."
                  required
                />
                <datalist id="books-datalist">
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.title}>
                      {b.author} (ISBN: {b.isbn})
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="issue-form-group">
                <label htmlFor="due-date" className="issue-form-label">
                  Due Return Date (14 Days Standard)
                </label>
                <input
                  id="due-date"
                  type="date"
                  className="issue-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              {errorMsg && (
                <div style={{ padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: "10px", fontSize: "0.88rem", fontWeight: 600 }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <button type="submit" className="issue-submit-btn" disabled={formLoading}>
                {formLoading ? "Issuing Book..." : "📖 Complete Book Issuance"}
              </button>
            </form>
          ) : (
            <div className="issue-success-box">
              <div className="issue-success-header">
                <span className="icon">🎉</span>
                <div>
                  <h4>Book Issued Successfully</h4>
                  <p>Transaction has been recorded and saved in the central catalog registry.</p>
                </div>
              </div>

              <div className="issue-details-grid">
                <div className="issue-detail-item">
                  <span className="label">Transaction ID</span>
                  <span className="value">#TXN-{createdTxn?.id ? String(createdTxn.id).padStart(4, "0") : "REC"}</span>
                </div>
                <div className="issue-detail-item">
                  <span className="label">Student</span>
                  <span className="value">{createdTxn?.student?.user?.username || studentName} ({rollNo})</span>
                </div>
                <div className="issue-detail-item">
                  <span className="label">Book Title</span>
                  <span className="value">{createdTxn?.book?.title || selectedBook}</span>
                </div>
                <div className="issue-detail-item">
                  <span className="label">Due Date</span>
                  <span className="value">{createdTxn?.dueDate ? new Date(createdTxn.dueDate).toLocaleDateString() : dueDate}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="issue-next-btn"
                  style={{ background: "#0f766e", flex: 1, margin: 0 }}
                  onClick={() => setActiveTab("registry")}
                >
                  📚 View in Issued Books Registry &rarr;
                </button>
                <button
                  type="button"
                  className="issue-next-btn"
                  style={{ background: "#334155", flex: 1, margin: 0 }}
                  onClick={() => {
                    setIssuedSuccess(false);
                    setSelectedBook("");
                    setStudentName("");
                    setRollNo("");
                  }}
                >
                  ➕ Issue Another Book
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LibrarianIssueBookPage;
