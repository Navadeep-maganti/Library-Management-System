import React, { useState } from "react";

const PayFinePage = () => {
  const [showPolicy, setShowPolicy] = useState(false);

  return (
    <section className="student-info-panel">
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">PAYMENTS</p>
          <h2>Fine Status</h2>
        </div>
        <span className="book-count">No dues</span>
      </div>
      <div className="student-stat-grid">
        <div><span>Current balance</span><strong>₹0.00</strong></div>
        <div><span>Last payment</span><strong>Not applicable</strong></div>
        <div><span>Account standing</span><strong className="status-positive">Clear</strong></div>
      </div>
      <div className="student-empty-state">
        <strong>No pending fines</strong>
        <span>Your account currently has no outstanding library payments.</span>
        <button className="text-button" type="button" onClick={() => setShowPolicy((isOpen) => !isOpen)}>
          {showPolicy ? "Hide payment policy" : "View payment policy"}
        </button>
      </div>
      {showPolicy && <p className="student-note">Fines are calculated at the circulation desk and appear here after a book passes its due date.</p>}
    </section>
  );
};

export default PayFinePage;
