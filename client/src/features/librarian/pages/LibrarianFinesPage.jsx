import React, { useCallback, useEffect, useMemo, useState } from "react";
import LibrarianMobileDetailsModal from "../components/LibrarianMobileDetailsModal";
import "../styles/LibrarianFinesPage.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const LibrarianFinesPage = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  // Policy & Constants state
  const [policyConstants, setPolicyConstants] = useState({
    overdueFinePerDay: 5,
    maxBorrowDays: 14,
    maxRenewals: 2,
    renewalExtendsDays: 7,
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'paid'
  const [typeFilter, setTypeFilter] = useState("all");

  // Modals
  const [selectedDetailFine, setSelectedDetailFine] = useState(null);
  const [receiptFine, setReceiptFine] = useState(null);
  const [selectedMobileFine, setSelectedMobileFine] = useState(null);

  // Load policy constants
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/constants`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.constants) {
          setPolicyConstants(data.constants);
        }
      })
      .catch(() => {});
  }, []);

  // Load fines from API
  const loadFines = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
        setError("");
      } else {
        setRefreshing(true);
      }
      const res = await fetch(`${API_BASE_URL}/api/fines`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load fine records.");
      }
      setFines(Array.isArray(data.fines) ? data.fines : []);
    } catch (err) {
      if (!isSilent) {
        setError(err.message || "Unable to fetch fines from server.");
      }
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Explicit sync of overdue fines
  const handleSyncOverdues = async () => {
    try {
      setSyncing(true);
      setNotice(null);
      const res = await fetch(`${API_BASE_URL}/api/fines/sync`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to synchronize overdue fines.");
      }
      setNotice({
        type: "success",
        text: "Overdue fines recalculated & synchronized with active book loans.",
      });
      await loadFines(true);
    } catch (err) {
      setNotice({
        type: "error",
        text: err.message || "Could not sync overdue fines.",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadFines();
    const intervalId = window.setInterval(() => loadFines(true), 25000);
    return () => window.clearInterval(intervalId);
  }, [loadFines]);

  // Derived metrics
  const {
    totalCount,
    totalAmount,
    pendingCount,
    pendingAmount,
    paidCount,
    paidAmount,
    defaultersCount,
    availableFineTypes,
  } = useMemo(() => {
    let totAmt = 0;
    let pendCount = 0;
    let pendAmt = 0;
    let pCount = 0;
    let pAmt = 0;
    const defaultersSet = new Set();
    const typesSet = new Set();

    fines.forEach((f) => {
      const amt = Number(f.amount) || 0;
      totAmt += amt;
      const typeName = f.fineType?.type || "Standard Fine";
      typesSet.add(typeName);

      if (f.isPaid) {
        pCount += 1;
        pAmt += amt;
      } else {
        pendCount += 1;
        pendAmt += amt;
        if (f.studentId) defaultersSet.add(f.studentId);
      }
    });

    return {
      totalCount: fines.length,
      totalAmount: totAmt,
      pendingCount: pendCount,
      pendingAmount: pendAmt,
      paidCount: pCount,
      paidAmount: pAmt,
      defaultersCount: defaultersSet.size,
      availableFineTypes: Array.from(typesSet),
    };
  }, [fines]);

  // Filtered fines list
  const filteredFines = useMemo(() => {
    return fines.filter((f) => {
      // Status filter
      if (statusFilter === "pending" && f.isPaid) return false;
      if (statusFilter === "paid" && !f.isPaid) return false;

      // Type filter
      if (typeFilter !== "all") {
        const typeName = f.fineType?.type || "Standard Fine";
        if (typeName.toLowerCase() !== typeFilter.toLowerCase()) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesId =
          String(f.id).includes(q) ||
          `fine-${f.id}`.toLowerCase().includes(q) ||
          `#${f.id}`.includes(q);
        const matchesStudent =
          (f.student?.user?.username || "").toLowerCase().includes(q) ||
          (f.student?.rollNo || f.studentId || "").toLowerCase().includes(q) ||
          (f.student?.user?.email || "").toLowerCase().includes(q);
        const matchesBook = (f.issuedBook?.book?.title || "")
          .toLowerCase()
          .includes(q);
        const matchesDesc = (f.description || "").toLowerCase().includes(q);
        const matchesType = (f.fineType?.type || "").toLowerCase().includes(q);
        const matchesStatus = (
          f.isPaid ? "paid settled" : "unpaid pending overdue due"
        ).includes(q);
        const matchesTxn = (f.payments || []).some(
          (p) =>
            (p.transactionId || "").toLowerCase().includes(q) ||
            (p.paymentMethod || "").toLowerCase().includes(q)
        );

        return (
          matchesId ||
          matchesStudent ||
          matchesBook ||
          matchesDesc ||
          matchesType ||
          matchesStatus ||
          matchesTxn
        );
      }

      return true;
    });
  }, [fines, statusFilter, typeFilter, searchTerm]);

  // Helper to extract latest payment for receipt
  const receiptLatestPayment = useMemo(() => {
    if (!receiptFine?.payments || receiptFine.payments.length === 0) return null;
    return receiptFine.payments[receiptFine.payments.length - 1];
  }, [receiptFine]);

  return (
    <div className="fines-page-container">
      {/* Mobile Drawer Details */}
      <LibrarianMobileDetailsModal
        item={selectedMobileFine}
        onClose={() => setSelectedMobileFine(null)}
        title={
          selectedMobileFine?.issuedBook?.book?.title ||
          selectedMobileFine?.fineType?.type ||
          "Fine Record"
        }
        subtitle={
          selectedMobileFine &&
          `Fine #FINE-${String(selectedMobileFine.id).padStart(4, "0")}`
        }
        status={
          selectedMobileFine?.isPaid
            ? "Settled by Student"
            : "Payable by Student"
        }
        fields={
          selectedMobileFine
            ? [
                {
                  label: "Payable By (Student)",
                  value: selectedMobileFine.student?.user?.username,
                },
                {
                  label: "Student Roll No",
                  value:
                    selectedMobileFine.student?.rollNo ||
                    selectedMobileFine.studentId,
                },
                {
                  label: "Department",
                  value:
                    selectedMobileFine.student?.department || "General",
                },
                {
                  label: "Institutional Email",
                  value:
                    selectedMobileFine.student?.user?.email || "—",
                },
                {
                  label: "Book Borrowed",
                  value:
                    selectedMobileFine.issuedBook?.book?.title || "—",
                },
                {
                  label: "Amount Due",
                  value: `₹${Number(selectedMobileFine.amount).toFixed(2)}`,
                },
                {
                  label: "Penalty Reason",
                  value:
                    selectedMobileFine.description || "Overdue book loan",
                },
                {
                  label: "Date Accrued",
                  value: new Date(selectedMobileFine.issueDate).toLocaleString(),
                },
                {
                  label: "Loan Status",
                  value: selectedMobileFine.issuedBook
                    ? selectedMobileFine.issuedBook.isReturned
                      ? "✓ Book Returned"
                      : "⚠️ Still with Student (Overdue)"
                    : "Standard Penalty",
                },
                {
                  label: "Settlement Status",
                  value: selectedMobileFine.isPaid
                    ? `Paid via ${
                        selectedMobileFine.payments?.[0]?.paymentMethod || "CASH"
                      }`
                    : "Pending Payment by Student",
                },
              ]
            : []
        }
      >
        {selectedMobileFine?.isPaid && (
          <button
            type="button"
            className="fines-btn-receipt"
            onClick={() => {
              const f = selectedMobileFine;
              setSelectedMobileFine(null);
              setReceiptFine(f);
            }}
          >
            🧾 View Receipt
          </button>
        )}
      </LibrarianMobileDetailsModal>

      {/* Header Banner */}
      <header className="fines-header">
        <div className="fines-header-content">
          <span className="fines-badge">Circulation · Dues & Overdues Audit</span>
          <h2>Student Overdue Fines & Penalty Dues</h2>
          <p>
            Monitor outstanding library dues, review amounts payable by students,
            and inspect daily overdue accrual policies.
          </p>
        </div>
        <div className="fines-header-actions">
          <button
            type="button"
            className="fines-btn-refresh"
            onClick={handleSyncOverdues}
            title="Recalculate and synchronize all overdue loans with fines registry"
            disabled={syncing || loading}
          >
            <span className={`fines-btn-icon ${syncing ? "spinning" : ""}`}>⚡</span> {syncing ? "Syncing..." : "Sync Overdues"}
          </button>
          <button
            type="button"
            className="fines-btn-refresh"
            onClick={() => loadFines(true)}
            title="Refresh fines list"
            disabled={refreshing || loading}
          >
            <span className={`fines-btn-icon ${refreshing ? "spinning" : ""}`}>🔄</span> Refresh
          </button>
        </div>
      </header>

      {/* Alert Notice Toast */}
      {notice && (
        <div className={`fines-notice ${notice.type}`} role="alert">
          <span>{notice.text}</span>
          <button
            type="button"
            className="fines-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================
          Fine Policy & Calculation Guide Section
          ========================================================= */}
      <section className="fines-policy-section">
        <div className="fines-policy-header">
          <div className="fines-policy-title">
            <span className="fines-policy-icon">📋</span>
            <div>
              <h3>How Fines Are Charged & Calculated</h3>
              <p>Official Central Library Circulation Penalty Rules & Daily Rates</p>
            </div>
          </div>
          <span className="fines-policy-pill">Daily Auto-Accrual Policy</span>
        </div>

        <div className="fines-policy-grid">
          <div className="fines-policy-card">
            <div className="fines-policy-card-icon">⏱️</div>
            <div className="fines-policy-card-body">
              <strong>Overdue Daily Rate</strong>
              <div className="fines-policy-card-highlight">
                ₹{Number(policyConstants.overdueFinePerDay || 5).toFixed(2)} / day
              </div>
              <span>Charged automatically per day for every book retained past its due date.</span>
            </div>
          </div>

          <div className="fines-policy-card">
            <div className="fines-policy-card-icon">📅</div>
            <div className="fines-policy-card-body">
              <strong>Standard Loan Duration</strong>
              <div className="fines-policy-card-highlight">
                {policyConstants.maxBorrowDays || 14} Calendar Days
              </div>
              <span>The maximum borrowing period allowed before a loan enters overdue penalty status.</span>
            </div>
          </div>

          <div className="fines-policy-card">
            <div className="fines-policy-card-icon">🔄</div>
            <div className="fines-policy-card-body">
              <strong>Renewals & Extension</strong>
              <div className="fines-policy-card-highlight">
                Up to {policyConstants.maxRenewals || 2} Renewals (+{policyConstants.renewalExtendsDays || 7}d)
              </div>
              <span>Eligible before due date if no queue reservation exists for the title.</span>
            </div>
          </div>

          <div className="fines-policy-card formula">
            <div className="fines-policy-card-icon">🧮</div>
            <div className="fines-policy-card-body">
              <strong>Penalty Formula</strong>
              <div className="fines-policy-formula-box">
                Dues = Days Overdue × ₹{Number(policyConstants.overdueFinePerDay || 5).toFixed(2)}/day
              </div>
              <span>Dues accrue dynamically until the student returns the item or settles payment.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <div className="fines-metrics-grid">
        <div
          className={`fines-metric-card ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
          role="button"
          tabIndex={0}
        >
          <span className="fines-metric-label">Total Accrued Dues</span>
          <div className="fines-metric-val">
            ₹{totalAmount.toFixed(2)}
            <span className="fines-metric-sub">({totalCount} records)</span>
          </div>
        </div>

        <div
          className={`fines-metric-card ${
            statusFilter === "pending" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("pending")}
          role="button"
          tabIndex={0}
        >
          <span className="fines-metric-label">Payable by Students</span>
          <div className="fines-metric-val pending">
            ₹{pendingAmount.toFixed(2)}
            <span className="fines-metric-sub">({pendingCount} unpaid)</span>
          </div>
        </div>

        <div
          className={`fines-metric-card ${statusFilter === "paid" ? "active" : ""}`}
          onClick={() => setStatusFilter("paid")}
          role="button"
          tabIndex={0}
        >
          <span className="fines-metric-label">Settled by Students</span>
          <div className="fines-metric-val paid">
            ₹{paidAmount.toFixed(2)}
            <span className="fines-metric-sub">({paidCount} paid)</span>
          </div>
        </div>

        <div
          className="fines-metric-card"
          onClick={() => setStatusFilter("pending")}
          role="button"
          tabIndex={0}
        >
          <span className="fines-metric-label">Defaulter Students</span>
          <div className="fines-metric-val defaulters">
            {defaultersCount}
            <span className="fines-metric-sub">with outstanding dues</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="fines-card">
        {/* Search and Filters Toolbar */}
        <div className="fines-toolbar">
          <div className="fines-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by student name, roll no, email, book title, fine ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="fines-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="fines-search-clear-btn"
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="fines-toolbar-controls">
            {availableFineTypes.length > 0 && (
              <select
                className="fines-type-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by fine reason"
              >
                <option value="all">All Fine Types</option>
                {availableFineTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}

            <div className="fines-filter-tabs">
              <button
                type="button"
                className={`fines-filter-tab-btn ${
                  statusFilter === "all" ? "active" : ""
                }`}
                onClick={() => setStatusFilter("all")}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                className={`fines-filter-tab-btn ${
                  statusFilter === "pending" ? "active" : ""
                }`}
                onClick={() => setStatusFilter("pending")}
              >
                Payable ({pendingCount})
              </button>
              <button
                type="button"
                className={`fines-filter-tab-btn ${
                  statusFilter === "paid" ? "active" : ""
                }`}
                onClick={() => setStatusFilter("paid")}
              >
                Settled ({paidCount})
              </button>
            </div>
          </div>
        </div>

        {/* Fines Table */}
        <div className="fines-table-responsive">
          <table className="fines-table">
            <thead>
              <tr>
                <th>Fine ID</th>
                <th>Payable By (Student)</th>
                <th>Book & Loan Details</th>
                <th>Penalty Type</th>
                <th>Amount to Pay</th>
                <th>Date Accrued</th>
                <th>Payment Status</th>
                <th style={{ textAlign: "center" }}>Audit Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="fines-empty-state">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        className="spinning"
                        style={{
                          display: "inline-block",
                          fontSize: "1.5rem",
                        }}
                      >
                        🔄
                      </span>
                      <span>Loading fines and settlements...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="fines-empty-state error">
                    {error}
                  </td>
                </tr>
              ) : filteredFines.length ? (
                filteredFines.map((fine) => {
                  const payment = fine.payments?.[0];
                  const fineCode = `FINE-${String(fine.id).padStart(4, "0")}`;
                  const studentName =
                    fine.student?.user?.username || "Unknown student";
                  const studentRoll =
                    fine.student?.rollNo || fine.studentId || "—";
                  const studentDept =
                    fine.student?.department || "General";
                  const bookTitle = fine.issuedBook?.book?.title;
                  const typeLabel = fine.fineType?.type || "Fine";
                  const fineAmountNum = Number(fine.amount) || 0;
                  const isOverdueActive =
                    fine.issuedBook && !fine.issuedBook.isReturned;

                  return (
                    <tr key={fine.id}>
                      <td className="fines-font-mono">{fineCode}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {studentName}
                        </div>
                        <div className="fines-sub-text">
                          Roll: <strong>{studentRoll}</strong> · {studentDept}
                        </div>
                      </td>
                      <td>
                        {bookTitle ? (
                          <>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#0f172a",
                                maxWidth: "260px",
                              }}
                            >
                              {bookTitle}
                            </div>
                            <div className="fines-sub-text">
                              {fine.description || "Overdue issue"}
                            </div>
                            {fine.issuedBook && (
                              <div style={{ marginTop: "4px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    background: isOverdueActive
                                      ? "#fee2e2"
                                      : "#f1f5f9",
                                    color: isOverdueActive
                                      ? "#b91c1c"
                                      : "#475569",
                                    border: `1px solid ${
                                      isOverdueActive ? "#fca5a5" : "#cbd5e1"
                                    }`,
                                  }}
                                >
                                  {isOverdueActive
                                    ? `⚠️ Still with Student (Due: ${new Date(
                                        fine.issuedBook.dueDate
                                      ).toLocaleDateString()})`
                                    : "✓ Book Returned"}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ color: "#334155", maxWidth: "260px" }}>
                            {fine.description || "Library assessment"}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="fines-badge-type">{typeLabel}</span>
                      </td>
                      <td>
                        <div
                          className={`fines-amount-cell ${
                            fine.isPaid ? "paid" : "due"
                          }`}
                        >
                          ₹{fineAmountNum.toFixed(2)}
                        </div>
                        <div
                          style={{
                            fontSize: "0.74rem",
                            color: fine.isPaid ? "#059669" : "#b45309",
                            fontWeight: 600,
                          }}
                        >
                          {fine.isPaid ? "Settled" : "Due from student"}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(fine.issueDate).toLocaleDateString()}
                        </div>
                        <div
                          style={{ fontSize: "0.75rem", color: "#64748b" }}
                        >
                          {new Date(fine.issueDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`fines-badge-status ${
                            fine.isPaid ? "paid" : "pending"
                          }`}
                        >
                          {fine.isPaid
                            ? `✓ Settled (${
                                payment?.paymentMethod || "CASH"
                              })`
                            : "● Pending Payment"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            type="button"
                            className="fines-btn-details"
                            onClick={() => setSelectedDetailFine(fine)}
                            title="View student debtor breakdown and loan info"
                          >
                            🔍 Details
                          </button>
                          {fine.isPaid && (
                            <button
                              type="button"
                              className="fines-btn-receipt"
                              onClick={() => setReceiptFine(fine)}
                              title="View / Print Receipt"
                            >
                              🧾 Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="fines-empty-state">
                    {searchTerm
                      ? `No fine records found matching "${searchTerm}".`
                      : "No fine records currently in the library registry."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Record List */}
        {!loading && !error && filteredFines.length > 0 && (
          <div className="librarian-mobile-records">
            {filteredFines.map((fine) => (
              <button
                type="button"
                className="librarian-mobile-record"
                key={fine.id}
                onClick={() => setSelectedMobileFine(fine)}
              >
                <strong>
                  {fine.issuedBook?.book?.title ||
                    fine.fineType?.type ||
                    "Fine Record"}{" "}
                  — ₹{Number(fine.amount).toFixed(2)}
                </strong>
                <span>
                  By: {fine.student?.user?.username || fine.studentId} ·{" "}
                  {fine.isPaid ? "Settled" : "Due from student"}
                </span>
                <em>›</em>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================
          Student Fine Details Modal (View Only - No Payment)
          ========================================================= */}
      {selectedDetailFine && (
        <div
          className="fines-modal-backdrop"
          onClick={() => setSelectedDetailFine(null)}
          role="presentation"
        >
          <div
            className="fines-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-modal-title"
          >
            <div className="fines-modal-header">
              <div>
                <h3 id="details-modal-title">Student Fine Assessment</h3>
                <p>
                  Record FINE-{String(selectedDetailFine.id).padStart(4, "0")} ·{" "}
                  {selectedDetailFine.isPaid
                    ? "Settled Record"
                    : "Outstanding Student Debt"}
                </p>
              </div>
              <button
                type="button"
                className="fines-modal-close-btn"
                onClick={() => setSelectedDetailFine(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="fines-modal-body">
              {/* Summary Card */}
              <div className="fines-modal-summary-box">
                <div className="fines-summary-details">
                  <span className="fines-summary-title">
                    {selectedDetailFine.student?.user?.username ||
                      "Student Account"}
                  </span>
                  <span className="fines-summary-meta">
                    Roll No:{" "}
                    <strong>
                      {selectedDetailFine.student?.rollNo ||
                        selectedDetailFine.studentId}
                    </strong>
                  </span>
                  <span className="fines-summary-meta">
                    Department:{" "}
                    {selectedDetailFine.student?.department || "General"}
                  </span>
                  {selectedDetailFine.student?.user?.email && (
                    <span className="fines-summary-meta">
                      Email: {selectedDetailFine.student.user.email}
                    </span>
                  )}
                </div>
                <div className="fines-summary-amount-badge">
                  <div className="fines-summary-amount-label">
                    {selectedDetailFine.isPaid ? "Amount Settled" : "Amount to Pay"}
                  </div>
                  <div
                    className="fines-summary-amount-val"
                    style={{
                      color: selectedDetailFine.isPaid ? "#0f766e" : "#dc2626",
                    }}
                  >
                    ₹{Number(selectedDetailFine.amount).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Grid of full audit details */}
              <div className="fines-details-grid">
                <div className="fines-details-item">
                  <span className="fines-details-label">Borrowed Book</span>
                  <span className="fines-details-val">
                    {selectedDetailFine.issuedBook?.book?.title || "—"}
                  </span>
                </div>

                <div className="fines-details-item">
                  <span className="fines-details-label">Author</span>
                  <span className="fines-details-val">
                    {selectedDetailFine.issuedBook?.book?.author || "—"}
                  </span>
                </div>

                <div className="fines-details-item">
                  <span className="fines-details-label">Loan Due Date</span>
                  <span className="fines-details-val">
                    {selectedDetailFine.issuedBook?.dueDate
                      ? new Date(
                          selectedDetailFine.issuedBook.dueDate
                        ).toLocaleDateString()
                      : "—"}
                  </span>
                </div>

                <div className="fines-details-item">
                  <span className="fines-details-label">Circulation Status</span>
                  <span className="fines-details-val">
                    {selectedDetailFine.issuedBook?.isReturned
                      ? "✓ Book Returned"
                      : "⚠️ Still with Student (Active Loan)"}
                  </span>
                </div>

                <div className="fines-details-item">
                  <span className="fines-details-label">Penalty Category</span>
                  <span className="fines-details-val">
                    {selectedDetailFine.fineType?.type || "Overdue Return"}
                  </span>
                </div>

                <div className="fines-details-item">
                  <span className="fines-details-label">Calculation Breakdown</span>
                  <span className="fines-details-val">
                    {selectedDetailFine.description || "Overdue calculation"}
                  </span>
                </div>
              </div>

              {/* Policy note */}
              <div className="fines-details-note">
                <span>ℹ️</span>
                <span>
                  {selectedDetailFine.isPaid
                    ? "This fine has been settled and cleared. An official receipt is available."
                    : "This overdue penalty is owed by the student. Dues must be cleared by the student before new book reservations, renewals, or institutional library clearance."}
                </span>
              </div>
            </div>

            <div className="fines-modal-footer">
              <button
                type="button"
                className="fines-btn-cancel"
                onClick={() => setSelectedDetailFine(null)}
              >
                Close
              </button>
              {selectedDetailFine.isPaid && (
                <button
                  type="button"
                  className="fines-btn-submit"
                  onClick={() => {
                    const f = selectedDetailFine;
                    setSelectedDetailFine(null);
                    setReceiptFine(f);
                  }}
                >
                  🧾 View Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          Official Receipt Modal (For Settled Fines)
          ========================================================= */}
      {receiptFine && (
        <div
          className="fines-modal-backdrop"
          onClick={() => setReceiptFine(null)}
          role="presentation"
        >
          <div
            className="fines-receipt-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-modal-title"
          >
            <div className="fines-receipt-printable">
              <div className="fines-receipt-top">
                <div className="fines-receipt-institution">
                  National Institute of Technology Andhra Pradesh
                </div>
                <h2 id="receipt-modal-title">Central Library Payment Receipt</h2>
                <p>Official Acknowledgement of Fine Settlement</p>
              </div>

              <dl className="fines-receipt-grid">
                <div className="fines-receipt-field">
                  <dt>Receipt / Fine ID</dt>
                  <dd>FINE-{String(receiptFine.id).padStart(4, "0")}</dd>
                </div>
                <div className="fines-receipt-field">
                  <dt>Payment Date</dt>
                  <dd>
                    {receiptLatestPayment?.paymentDate
                      ? new Date(
                          receiptLatestPayment.paymentDate
                        ).toLocaleString()
                      : new Date().toLocaleString()}
                  </dd>
                </div>
                <div className="fines-receipt-field">
                  <dt>Student Name</dt>
                  <dd>
                    {receiptFine.student?.user?.username || "Student Member"}
                  </dd>
                </div>
                <div className="fines-receipt-field">
                  <dt>Roll Number</dt>
                  <dd>
                    {receiptFine.student?.rollNo || receiptFine.studentId || "—"}
                  </dd>
                </div>
                <div className="fines-receipt-field">
                  <dt>Fine Reason</dt>
                  <dd>
                    {receiptFine.fineType?.type || "Circulation Penalty"}
                  </dd>
                </div>
                <div className="fines-receipt-field">
                  <dt>Book / Item</dt>
                  <dd>{receiptFine.issuedBook?.book?.title || "—"}</dd>
                </div>
                <div className="fines-receipt-field">
                  <dt>Payment Mode</dt>
                  <dd>
                    {receiptLatestPayment?.paymentMethod || "CASH"}
                  </dd>
                </div>
                <div className="fines-receipt-field">
                  <dt>Reference ID</dt>
                  <dd style={{ fontFamily: "monospace" }}>
                    {receiptLatestPayment?.transactionId ||
                      `REC-CASH-${receiptFine.id}`}
                  </dd>
                </div>
              </dl>

              <div className="fines-receipt-amount-block">
                <span className="fines-receipt-amount-label">
                  Total Amount Paid:
                </span>
                <span className="fines-receipt-amount-val">
                  ₹
                  {Number(
                    receiptLatestPayment?.amountPaid || receiptFine.amount
                  ).toFixed(2)}
                </span>
              </div>

              <div className="fines-receipt-stamp">
                <span>✓</span> SETTLED & CLEARED
              </div>

              <div className="fines-receipt-footer-notes">
                This is a computer-generated receipt issued by Central Library
                Management System.
              </div>
            </div>

            <div className="fines-receipt-actions">
              <button
                type="button"
                className="fines-btn-cancel"
                onClick={() => setReceiptFine(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="fines-btn-print"
                onClick={() => window.print()}
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarianFinesPage;
