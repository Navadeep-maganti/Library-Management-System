import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LibrarianPages.css";

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
    <div className="librarian-flow-page">
      <div className="flow-page-header">
        <div className="flow-badge">Step 1: View Requests</div>
        <h2>Pending Bookings List</h2>
        <p>Review student book reservation requests and initiate verification</p>
      </div>

      <div className="flow-card">
        <div className="table-responsive">
          <table className="flow-table">
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
                    <td className="font-mono">{req.id}</td>
                    <td>
                      <strong>{req.studentName}</strong>
                      <div className="sub-text">Roll: {req.rollNo}</div>
                    </td>
                    <td>
                      <strong>{req.bookTitle}</strong>
                      <div className="sub-text">By {req.author}</div>
                    </td>
                    <td>{req.requestDate}</td>
                    <td>
                      <span className="token-code">{req.token}</span>
                    </td>
                    <td>
                      <span className="badge badge-pending">{req.status}</span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          type="button"
                          className="btn-action primary"
                          onClick={() => handleVerify(req.token)}
                        >
                          🔑 Verify Token
                        </button>
                        <button
                          type="button"
                          className="btn-action danger"
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
                  <td colSpan="7" className="empty-state">
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
