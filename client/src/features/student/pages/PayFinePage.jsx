import React, { useEffect, useState } from "react";

const PayFinePage = () => {
  const [showPolicy, setShowPolicy] = useState(false);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);

  const getStudentRollNo = () => {
    try {
      const stored = localStorage.getItem("libraryUser");
      if (!stored) return "";
      const parsed = JSON.parse(stored);
      return (
        parsed.roll_no ||
        parsed.rollNo ||
        parsed.student_roll_no ||
        parsed.student?.rollNo ||
        ""
      );
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const rollNo = getStudentRollNo();
    const loadFines = async () => {
      try {
        setLoading(true);
        const url = rollNo ? `/api/fines?studentId=${encodeURIComponent(rollNo)}` : "/api/fines";
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.fines)) {
          setFines(data.fines);
        }
      } catch (err) {
        console.warn("Could not fetch student fines:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFines();
  }, []);

  const unpaidFines = fines.filter((f) => !f.isPaid);
  const paidFines = fines.filter((f) => f.isPaid);
  const totalDue = unpaidFines.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const latestPayment = paidFines.length > 0 ? paidFines[0] : null;

  return (
    <section className="student-info-panel">
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">PAYMENTS</p>
          <h2>Fine Status</h2>
        </div>
        <span className="book-count">
          {unpaidFines.length > 0 ? `${unpaidFines.length} due${unpaidFines.length > 1 ? "s" : ""}` : "No dues"}
        </span>
      </div>

      <div className="student-stat-grid">
        <div>
          <span>Current balance</span>
          <strong style={{ color: totalDue > 0 ? "#dc2626" : "inherit" }}>
            ₹{totalDue.toFixed(2)}
          </strong>
        </div>
        <div>
          <span>Last payment</span>
          <strong>
            {latestPayment
              ? `₹${Number(latestPayment.amount).toFixed(2)} (${new Date(
                  latestPayment.issueDate
                ).toLocaleDateString()})`
              : "None"}
          </strong>
        </div>
        <div>
          <span>Account standing</span>
          <strong className={totalDue > 0 ? "status-warning" : "status-positive"}>
            {totalDue > 0 ? "Pending Dues" : "Clear"}
          </strong>
        </div>
      </div>

      {loading ? (
        <div className="student-empty-state">
          <span>Loading fine details...</span>
        </div>
      ) : unpaidFines.length > 0 ? (
        <div style={{ marginTop: "16px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "#0f172a" }}>
            Outstanding Dues & Overdues
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {unpaidFines.map((fine) => (
              <div
                key={fine.id}
                style={{
                  background: "#fff",
                  border: "1px solid #fecaca",
                  borderLeft: "4px solid #dc2626",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: "0.95rem" }}>
                    {fine.issuedBook?.book?.title || fine.fineType?.type || "Circulation Fine"}
                  </strong>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {fine.description || "Overdue book loan"} · Issued: {new Date(fine.issueDate).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#dc2626" }}>
                    ₹{Number(fine.amount).toFixed(2)}
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "#b45309", fontWeight: 600 }}>
                    Payment Pending
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="student-note" style={{ marginTop: "14px" }}>
            Please visit the Central Library circulation desk to settle outstanding fines with the librarian.
          </p>
        </div>
      ) : (
        <div className="student-empty-state">
          <strong>No pending fines</strong>
          <span>Your account currently has no outstanding library payments.</span>
          <button className="text-button" type="button" onClick={() => setShowPolicy((isOpen) => !isOpen)}>
            {showPolicy ? "Hide payment policy" : "View payment policy"}
          </button>
        </div>
      )}

      {showPolicy && (
        <p className="student-note">
          Fines are automatically calculated for overdue loans at ₹5/day beyond the loan period. Settled receipts are available at the circulation desk.
        </p>
      )}
    </section>
  );
};

export default PayFinePage;
