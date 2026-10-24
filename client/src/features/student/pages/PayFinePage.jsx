import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getStudentFines } from "../services/finePaymentService";
import "../styles/FinePayment.css";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount || 0));

const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
    : "Date unavailable";

const daysOverdue = (dueDate) =>
  Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000));

const PayFinePage = () => {
  const { currentUser = {} } = useOutletContext();
  const studentId = currentUser.roll_no || currentUser.rollNo || "demo-student";
  const navigate = useNavigate();
  const [fines, setFines] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("due");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setLoadError("");

    getStudentFines(studentId)
      .then((records) => {
        if (isCurrent) setFines(records);
      })
      .catch((error) => {
        if (isCurrent) setLoadError(error.message || "Could not load your fine records.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [studentId]);

  const unpaidFines = useMemo(() => fines.filter((fine) => !fine.isPaid), [fines]);
  const paidFines = useMemo(() => fines.filter((fine) => fine.isPaid), [fines]);
  const selectedFines = unpaidFines.filter((fine) => selectedIds.includes(fine.id));
  const outstanding = unpaidFines.reduce((sum, fine) => sum + Number(fine.amount), 0);
  const paidTotal = paidFines.reduce((sum, fine) => sum + Number(fine.amount), 0);
  const latestPayment = fines
    .flatMap((fine) => fine.payments || [])
    .sort((first, second) => new Date(second.paymentDate) - new Date(first.paymentDate))[0];
  const selectedTotal = selectedFines.reduce((sum, fine) => sum + Number(fine.amount), 0);
  const allDueSelected = unpaidFines.length > 0 && selectedFines.length === unpaidFines.length;

  const toggleFine = (fineId) => {
    setSelectedIds((current) =>
      current.includes(fineId) ? current.filter((id) => id !== fineId) : [...current, fineId],
    );
  };

  const toggleAllDue = () => {
    setSelectedIds(allDueSelected ? [] : unpaidFines.map((fine) => fine.id));
  };

  const continueToPayment = () => {
    if (!selectedFines.length) return;
    const ids = selectedFines.map((fine) => fine.id).join(",");
    navigate(`/student-dashboard/payment?fines=${encodeURIComponent(ids)}`);
  };

  const visibleFines = activeTab === "due" ? unpaidFines : paidFines;

  return (
    <main className="fine-page">
      <header className="fine-page-header">
        <div>
          <p className="fine-eyebrow">STUDENT ACCOUNT / PAYMENTS</p>
          <h1>Fines &amp; payments</h1>
          <p className="fine-page-subtitle">Review library charges, choose what to settle, and keep track of past payments.</p>
        </div>
        <div className={`fine-standing ${isLoading ? "is-loading" : outstanding > 0 ? "is-due" : "is-clear"}`}>
          <span className="fine-standing-dot" />
          {isLoading ? "Checking account" : outstanding > 0 ? "Payment due" : "Account clear"}
        </div>
      </header>

      <section className="fine-balance-hero" aria-label="Outstanding balance">
        <div className="fine-balance-copy">
          <span>OUTSTANDING BALANCE</span>
          <strong>{isLoading ? "—" : formatCurrency(outstanding)}</strong>
          <p>{isLoading ? "Loading your account..." : `${unpaidFines.length} unpaid ${unpaidFines.length === 1 ? "fine" : "fines"} on your account`}</p>
        </div>
        <div className="fine-balance-mark" aria-hidden="true">₹</div>
        <div className="fine-balance-footnote">
          <span className="fine-balance-check">✓</span>
          <span>Payments are confirmed only after secure checkout verification.</span>
        </div>
      </section>

      <section className="fine-metrics" aria-label="Fine account summary">
        <article className="fine-metric-card">
          <span className="fine-metric-icon fine-icon-amber" aria-hidden="true">!</span>
          <div><span>Unpaid fines</span><strong>{isLoading ? "—" : unpaidFines.length}</strong></div>
          <small>Need your attention</small>
        </article>
        <article className="fine-metric-card">
          <span className="fine-metric-icon fine-icon-teal" aria-hidden="true">✓</span>
          <div><span>Paid to date</span><strong>{isLoading ? "—" : formatCurrency(paidTotal)}</strong></div>
          <small>{paidFines.length} completed {paidFines.length === 1 ? "payment" : "payments"}</small>
        </article>
        <article className="fine-metric-card">
          <span className="fine-metric-icon fine-icon-blue" aria-hidden="true">↗</span>
          <div><span>Last payment</span><strong>{isLoading ? "—" : latestPayment ? formatCurrency(latestPayment.amountPaid) : "None yet"}</strong></div>
          <small>{latestPayment ? `${formatDate(latestPayment.paymentDate)} · ${latestPayment.paymentMethod || "Payment"}` : "Your payment history will appear here"}</small>
        </article>
      </section>

      <section className="fine-records-panel">
        <div className="fine-section-heading">
          <div>
            <p className="fine-eyebrow">YOUR ACCOUNT</p>
            <h2>Fine records</h2>
            <p className="fine-muted">Charges linked to books borrowed from the library.</p>
          </div>
          <div className="fine-tabs" role="tablist" aria-label="Fine record status">
            <button className={activeTab === "due" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "due"} onClick={() => setActiveTab("due")}>
              Unpaid <span>{unpaidFines.length}</span>
            </button>
            <button className={activeTab === "paid" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "paid"} onClick={() => setActiveTab("paid")}>
              Paid <span>{paidFines.length}</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="fine-message fine-message-error" role="alert">
            <strong>We couldn’t load your fine records.</strong>
            <span>{loadError}</span>
          </div>
        )}

        {!loadError && isLoading && <div className="fine-loading" role="status">Loading fine records…</div>}

        {!loadError && !isLoading && visibleFines.length > 0 && activeTab === "due" && (
          <button className="fine-select-all" type="button" onClick={toggleAllDue}>
            <span className={`fine-checkbox ${allDueSelected ? "checked" : ""}`} aria-hidden="true">{allDueSelected ? "✓" : ""}</span>
            {allDueSelected ? "Clear selection" : "Select all unpaid fines"}
          </button>
        )}

        {!loadError && !isLoading && visibleFines.length > 0 && (
          <div className="fine-record-list">
            {visibleFines.map((fine) => {
              const dueDate = fine.issuedBook?.dueDate;
              const overdueDays = daysOverdue(dueDate);
              const selected = selectedIds.includes(fine.id);
              const payment = fine.payments?.[0];

              return (
                <article className={`fine-record ${selected ? "is-selected" : ""} ${activeTab === "paid" ? "fine-record-paid" : ""}`} key={fine.id}>
                  {activeTab === "due" && (
                    <button
                      className={`fine-checkbox fine-record-checkbox ${selected ? "checked" : ""}`}
                      type="button"
                      aria-label={`${selected ? "Deselect" : "Select"} fine for ${fine.issuedBook?.book?.title || "book"}`}
                      aria-pressed={selected}
                      onClick={() => toggleFine(fine.id)}
                    >
                      {selected ? "✓" : ""}
                    </button>
                  )}
                  <div className="fine-book-cover" aria-hidden="true">
                    <span>{(fine.issuedBook?.book?.title || "B").slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="fine-record-main">
                    <div className="fine-record-title-row">
                      <h3>{fine.issuedBook?.book?.title || "Library book"}</h3>
                      <span className={`fine-status-pill ${fine.isPaid ? "paid" : "unpaid"}`}>{fine.isPaid ? "Paid" : "Unpaid"}</span>
                    </div>
                    <p className="fine-book-author">{fine.issuedBook?.book?.author || "Library collection"}</p>
                    <div className="fine-record-meta">
                      <span>{fine.fineType?.type || "Library fine"}</span>
                      {dueDate && <span>Due {formatDate(dueDate)}</span>}
                      <span>Added {formatDate(fine.issueDate)}</span>
                    </div>
                    {fine.description && <p className="fine-description">{fine.description}</p>}
                  </div>
                  <div className="fine-record-amount">
                    <strong>{formatCurrency(fine.amount)}</strong>
                    {!fine.isPaid && dueDate && (
                      <span className="fine-overdue-label">{overdueDays > 0 ? `${overdueDays} days overdue` : "Due today"}</span>
                    )}
                    {fine.isPaid && payment && <span>Paid {formatDate(payment.paymentDate)}</span>}
                  </div>
                  {fine.isPaid && payment && (
                    <p className="fine-payment-reference">
                      {payment.paymentMethod || "Payment"} · Reference {payment.transactionId || "not available"}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loadError && !isLoading && visibleFines.length === 0 && (
          <div className="fine-empty-state">
            <span className="fine-empty-icon" aria-hidden="true">{activeTab === "due" ? "✓" : "▤"}</span>
            <h3>{activeTab === "due" ? "You’re all caught up" : "No payment history yet"}</h3>
            <p>{activeTab === "due" ? "There are no unpaid fines on your account." : "Completed fine payments will appear here."}</p>
          </div>
        )}

        {!loadError && !isLoading && activeTab === "due" && unpaidFines.length > 0 && (
          <div className="fine-list-footer">
            <span>{selectedFines.length ? `${selectedFines.length} selected` : "Select fines to continue"}</span>
            <div className="fine-footer-action">
              <strong>{formatCurrency(selectedTotal)}</strong>
              <button className="fine-primary-button" type="button" disabled={!selectedFines.length} onClick={continueToPayment}>
                Continue to payment <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="fine-policy-note">
        <span className="fine-policy-icon" aria-hidden="true">i</span>
        <div>
          <strong>How library fines work</strong>
          <p>Overdue charges are recorded by the library and shown here with the related book and due date. If a charge looks incorrect, contact the library desk before making a payment.</p>
        </div>
      </aside>
    </main>
  );
};

export default PayFinePage;
