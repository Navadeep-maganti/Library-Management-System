import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LibrarianRequestsPage.css";

const LibrarianRequestsPage = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([
    {
      id: "REQ-101",
      studentName: "Rahul Sharma",
      rollNo: "421101",
      bookTitle: "Introduction to Algorithms (CLRS)",
      author: "Cormen et al.",
      requestDate: "Aug 26, 2026",
      token: "TOK-9821",
      status: "Pending Verification",
    },
    {
      id: "REQ-102",
      studentName: "Priya Patel",
      rollNo: "421108",
      bookTitle: "Database System Concepts",
      author: "Silberschatz",
      requestDate: "Aug 27, 2026",
      token: "TOK-5542",
      status: "Pending Verification",
    },
    {
      id: "REQ-103",
      studentName: "Amit Kumar",
      rollNo: "421115",
      bookTitle: "Operating System Concepts",
      author: "Galvin",
      requestDate: "Aug 27, 2026",
      token: "TOK-3319",
      status: "Pending Verification",
    },
  ]);

  const handleVerify = (token) => {
    navigate(`/librarian/verify-token?token=${token}`);
  };

  const handleReject = (id) => {
    setRequests(requests.filter((r) => r.id !== id));
  };

  return (
    <div className="requests-page-container">
      <div className="requests-header">
        <div className="requests-badge">Step 1: View Requests</div>
        <h2>Pending Bookings List</h2>
        <p>Review student book reservation requests and initiate verification</p>
      </div>

      <div className="requests-card">
        <div className="requests-table-responsive">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Student</th>
                <th>Book Requested</th>
                <th>Request Date</th>
                <th>Verification Code</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td className="requests-font-mono">{req.id}</td>
                    <td>
                      <strong>{req.studentName}</strong>
                      <div className="requests-sub-text">Roll: {req.rollNo}</div>
                    </td>
                    <td>
                      <strong>{req.bookTitle}</strong>
                      <div className="requests-sub-text">By {req.author}</div>
                    </td>
                    <td>{req.requestDate}</td>
                    <td>
                      <span className="requests-token-code">{req.token}</span>
                    </td>
                    <td>
                      <span className="requests-badge-status">{req.status}</span>
                    </td>
                    <td>
                      <div className="requests-btn-group">
                        <button
                          type="button"
                          className="requests-btn-verify"
                          onClick={() => handleVerify(req.token)}
                        >
                          🔑 Verify Token
                        </button>
                        <button
                          type="button"
                          className="requests-btn-reject"
                          onClick={() => handleReject(req.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="requests-empty-state">
                    No pending booking requests at this moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LibrarianRequestsPage;
