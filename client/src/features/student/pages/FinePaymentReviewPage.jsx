import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { getStudentFines } from "../services/finePaymentService";
import "../styles/FinePayment.css";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount || 0));

const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
    : "Date unavailable";

const FinePaymentReviewPage = () => {
  const { currentUser = {} } = useOutletContext();
  const studentId = currentUser.roll_no || currentUser.rollNo || "demo-student";
  const [searchParams] = useSearchParams();
  const requestedIds = useMemo(
    () => new Set((searchParams.get("fines") || "").split(",").filter(Boolean).map(Number)),
    [searchParams],
  );
  const [fines, setFines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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

  const selectedFines = fines.filter((fine) => requestedIds.has(fine.id) && !fine.isPaid);
  const unavailableCount = requestedIds.size - selectedFines.length;
  const total = selectedFines.reduce((sum, fine) => sum + Number(fine.amount), 0);

  return (
    <main className="fine-page fine-review-page">
      <Link className="fine-back-link" to="/student-dashboard/payfine"><span aria-hidden="true">←</span> Back to fines</Link>

      <header className="fine-page-header fine-review-header">
        <div>
          <p className="fine-eyebrow">PAYMENTS / REVIEW</p>
          <h1>Review your payment</h1>
          <p className="fine-page-subtitle">Check the fines and total before continuing to secure checkout.</p>
        </div>
        <div className="fine-secure-label"><span aria-hidden="true">◇</span> Secure payment</div>
      </header>

      {loadError && <div className="fine-message fine-message-error" role="alert"><strong>We couldn’t load your payment details.</strong><span>{loadError}</span></div>}
      {!loadError && isLoading && <div className="fine-loading" role="status">Loading selected fines…</div>}
      {!loadError && !isLoading && requestedIds.size === 0 && (
        <div className="fine-message"><strong>No fines selected.</strong><span>Return to your fine records and select at least one unpaid fine.</span></div>
      )}
      {!loadError && !isLoading && requestedIds.size > 0 && unavailableCount > 0 && (
        <div className="fine-message fine-message-warning" role="status">
          <strong>{unavailableCount === requestedIds.size ? "These fines are no longer available for payment." : "Some selected fines have changed."}</strong>
          <span>Only fines that are still unpaid are included in this review. Please check the updated list and total.</span>
        </div>
      )}

      {!loadError && !isLoading && selectedFines.length > 0 && (
        <div className="fine-review-layout">
          <section className="fine-review-card">
            <div className="fine-review-card-heading">
              <div><p className="fine-eyebrow">PAYMENT SUMMARY</p><h2>{selectedFines.length} {selectedFines.length === 1 ? "fine" : "fines"} selected</h2></div>
              <span className="fine-status-pill unpaid">Unpaid</span>
            </div>

            <div className="fine-review-items">
              {selectedFines.map((fine) => (
                <article className="fine-review-item" key={fine.id}>
                  <div className="fine-book-cover fine-review-cover" aria-hidden="true"><span>{(fine.issuedBook?.book?.title || "B").slice(0, 1).toUpperCase()}</span></div>
                  <div className="fine-review-item-copy">
                    <strong>{fine.issuedBook?.book?.title || "Library book"}</strong>
                    <span>{fine.fineType?.type || "Library fine"} · Due {formatDate(fine.issuedBook?.dueDate)}</span>
                  </div>
                  <strong className="fine-review-item-amount">{formatCurrency(fine.amount)}</strong>
                </article>
              ))}
            </div>

            <div className="fine-total-row"><span>Amount due</span><strong>{formatCurrency(total)}</strong></div>
            <div className="fine-total-row fine-total-grand"><span>Total payable</span><strong>{formatCurrency(total)}</strong></div>
            <p className="fine-no-fees">No additional convenience fees are included in this preview.</p>
          </section>

          <aside className="fine-checkout-card">
            <span className="fine-checkout-emblem" aria-hidden="true">₹</span>
            <p className="fine-eyebrow">READY WHEN YOU ARE</p>
            <h2>Complete your payment</h2>
            <p className="fine-checkout-copy">Your fines will remain unpaid until the payment provider confirms the transaction.</p>
            <div className="fine-checkout-total"><span>Total payable</span><strong>{formatCurrency(total)}</strong></div>
            <button className="fine-primary-button fine-checkout-button" type="button" disabled aria-describedby="fine-checkout-note">
              Continue with Razorpay <span aria-hidden="true">→</span>
            </button>
            <p className="fine-checkout-note" id="fine-checkout-note">Secure checkout will be available when Razorpay order creation and payment verification are connected.</p>
            <div className="fine-trust-note"><span aria-hidden="true">✓</span><span>We’ll only mark a fine paid after the server verifies the payment.</span></div>
          </aside>
        </div>
      )}

      {!loadError && !isLoading && selectedFines.length === 0 && (
        <div className="fine-review-empty">
          <span className="fine-empty-icon" aria-hidden="true">↗</span>
          <h2>Nothing to review</h2>
          <p>Choose one or more unpaid fines to see the payment summary.</p>
          <Link className="fine-primary-button fine-link-button" to="/student-dashboard/payfine">Go to fine records</Link>
        </div>
      )}
    </main>
  );
};

export default FinePaymentReviewPage;
