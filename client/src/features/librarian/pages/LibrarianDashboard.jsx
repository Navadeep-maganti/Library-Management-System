import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/LibrarianDashboard.css";

const LibrarianDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [issuedRecords, setIssuedRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

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

  // Fetch real circulation records from database
  useEffect(() => {
    const fetchIssuedBooks = async () => {
      try {
        setLoadingRecords(true);
        const res = await fetch("/api/issued-books");
        const data = await res.json();
        if (data.success && Array.isArray(data.issuedBooks)) {
          setIssuedRecords(data.issuedBooks);
        }
      } catch (err) {
        console.error("Error fetching issued books:", err);
      } finally {
        setLoadingRecords(false);
      }
    };
    fetchIssuedBooks();
  }, []);

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
          <Link to="/librarian/requests" className="librarian-flow-card">
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
          <button type="button" className="librarian-btn-secondary" onClick={() => navigate("/librarian/requests")}>
            <span>📋</span> View Pending Requests
          </button>
          <button type="button" className="librarian-btn-secondary" onClick={() => navigate("/librarian/update-stock")}>
            <span>📦</span> Update Inventory
          </button>
        </div>
      </section>

      {/* Recent Library Transactions */}
      <section className="librarian-table-card">
        <div className="librarian-table-header">
          <div>
            <h3 className="librarian-section-title" style={{ fontSize: "1.25rem" }}>Recent Circulation Records</h3>
            <p className="librarian-section-subtitle">Live circulation records from database</p>
          </div>
        </div>

        <div className="librarian-table-wrapper">
          <table className="librarian-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Student</th>
                <th>Book Title</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    Loading circulation records...
                  </td>
                </tr>
              ) : issuedRecords.length > 0 ? (
                issuedRecords.map((txn) => {
                  const isOverdue = new Date(txn.dueDate) < new Date() && !txn.isReturned;
                  const statusClass = txn.isReturned ? "returned" : isOverdue ? "overdue" : "issued";
                  const statusLabel = txn.isReturned ? "✓ Returned" : isOverdue ? "⚠ Overdue" : "● Issued";

                  return (
                    <tr key={txn.id}>
                      <td className="txn-id">#TXN-{txn.id}</td>
                      <td className="student-cell">
                        {txn.student?.user?.username || txn.studentId}
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>
                          Roll: {txn.studentId}
                        </span>
                      </td>
                      <td className="book-cell">{txn.book?.title || "Book Title"}</td>
                      <td>{new Date(txn.issueDate).toLocaleDateString()}</td>
                      <td>{new Date(txn.dueDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#64748b", fontStyle: "italic" }}>
                    No books currently issued in the database. Use "Issue Book" to create a new transaction.
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
