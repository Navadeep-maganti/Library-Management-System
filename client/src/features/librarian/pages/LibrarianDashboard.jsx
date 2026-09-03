import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/LibrarianDashboard.css";

const LibrarianDashboard = ({ user }) => {
  const navigate = useNavigate();

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

  if (!currentUser) {
    return null;
  }

  return (
    <div className="librarian-dashboard-shell">
      {/* Librarian Profile Overview */}
      <div className="librarian-header-card">
        <h2 className="librarian-title">Librarian Management Dashboard</h2>
        <p className="librarian-sub">Central Library Staff Overview Hub & Operations Portal</p>

        <div className="librarian-info-box">
          <div className="librarian-info-item">
            <strong>Name:</strong> {currentUser?.username || "Librarian Staff"}
          </div>
          <div className="librarian-info-item">
            <strong>Staff ID:</strong> {currentUser?.staff_id || "LIB-STAFF-01"}
          </div>
          <div className="librarian-info-item">
            <strong>Role:</strong> Librarian Administrator
          </div>
          <div className="librarian-info-item">
            <strong>Email:</strong> {currentUser?.email || "staff@nitandhra.ac.in"}
          </div>
        </div>
      </div>

      {/* Librarian User Flow Overview Cards */}
      <div className="librarian-section">
        <h3 className="librarian-heading">Librarian Operations Workflow</h3>
        <p className="librarian-section-sub">Follow the step-by-step branch for staff operations:</p>

        <div className="flow-steps-grid">
          <Link to="/librarian/requests" className="flow-step-card">
            <div className="flow-step-number">Step 1</div>
            <div className="flow-step-icon">📋</div>
            <h4 className="flow-step-title">View Requests</h4>
            <p className="flow-step-desc">Pending bookings list from students</p>
          </Link>

          <Link to="/librarian/verify-token" className="flow-step-card">
            <div className="flow-step-number">Step 2</div>
            <div className="flow-step-icon">🔑</div>
            <h4 className="flow-step-title">Verify Token</h4>
            <p className="flow-step-desc">Scan or enter student OTP code</p>
          </Link>

          <Link to="/librarian/issue-book" className="flow-step-card">
            <div className="flow-step-number">Step 3</div>
            <div className="flow-step-icon">📖</div>
            <h4 className="flow-step-title">Issue Book</h4>
            <p className="flow-step-desc">Update status to "Issued" & set due date</p>
          </Link>

          <Link to="/librarian/update-stock" className="flow-step-card">
            <div className="flow-step-number">Step 4</div>
            <div className="flow-step-icon">📦</div>
            <h4 className="flow-step-title">Update Stock</h4>
            <p className="flow-step-desc">Final inventory synchronization</p>
          </Link>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div className="librarian-section">
        <h3 className="librarian-heading">Quick Actions</h3>
        <div className="actions-row">
          <button type="button" className="dummy-btn primary" onClick={() => navigate("/librarian/issue-book")}>
            + Issue New Book
          </button>
          <button type="button" className="dummy-btn" onClick={() => navigate("/librarian/verify-token")}>
            🔑 Verify Student Code
          </button>
          <button type="button" className="dummy-btn" onClick={() => navigate("/librarian/update-stock")}>
            📦 Catalog Inventory
          </button>
          <button type="button" className="dummy-btn" onClick={() => navigate("/librarian/requests")}>
            📋 View Pending Bookings
          </button>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="librarian-section">
        <h3 className="librarian-heading">Recent Library Transactions</h3>
        <div className="dummy-table-wrapper">
          <table className="dummy-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Student Roll No</th>
                <th>Book Title</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#TXN-9081</td>
                <td>421101</td>
                <td>Introduction to Algorithms</td>
                <td>Aug 15, 2026</td>
                <td>Aug 30, 2026</td>
                <td><span className="status-badge issued">Issued</span></td>
              </tr>
              <tr>
                <td>#TXN-9082</td>
                <td>421105</td>
                <td>Digital Logic & Design</td>
                <td>Aug 10, 2026</td>
                <td>Aug 25, 2026</td>
                <td><span className="status-badge returned">Returned</span></td>
              </tr>
              <tr>
                <td>#TXN-9083</td>
                <td>421112</td>
                <td>Database System Concepts</td>
                <td>Aug 01, 2026</td>
                <td>Aug 16, 2026</td>
                <td><span className="status-badge overdue">Overdue</span></td>
              </tr>
              <tr>
                <td>#TXN-9084</td>
                <td>421120</td>
                <td>Computer Networks (Tanenbaum)</td>
                <td>Aug 18, 2026</td>
                <td>Sep 02, 2026</td>
                <td><span className="status-badge issued">Issued</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LibrarianDashboard;
