import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/LibrarianPages.css";

const LibrarianIssueBookPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStudent = searchParams.get("student") || "Rahul Sharma";
  const initialRoll = searchParams.get("roll") || "421101";
  const initialBook = searchParams.get("book") || "Introduction to Algorithms (CLRS)";

  const [studentName, setStudentName] = useState(initialStudent);
  const [rollNo, setRollNo] = useState(initialRoll);
  const [selectedBook, setSelectedBook] = useState(initialBook);
  const [dueDate, setDueDate] = useState("2026-09-10");
  const [issuedSuccess, setIssuedSuccess] = useState(false);

  const handleIssueBook = (e) => {
    e.preventDefault();
    setIssuedSuccess(true);
  };

  return (
    <div className="librarian-flow-page">
      <div className="flow-page-header">
        <div className="flow-badge">Step 3: Issue Book</div>
        <h2>Confirm & Issue Book</h2>
        <p>Assign physical inventory to student and update status to "Issued"</p>
      </div>

      <div className="flow-card max-w-600">
        {!issuedSuccess ? (
          <form onSubmit={handleIssueBook} className="issue-form">
            <div className="form-group">
              <label htmlFor="student-name" className="form-label">Student Name</label>
              <input
                id="student-name"
                type="text"
                className="token-input"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="roll-no" className="form-label">Roll Number</label>
              <input
                id="roll-no"
                type="text"
                className="token-input"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="select-book" className="form-label">Select Book Title</label>
              <input
                id="select-book"
                type="text"
                className="token-input"
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="due-date" className="form-label">Due Return Date</label>
              <input
                id="due-date"
                type="date"
                className="token-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-action primary full-width">
              📖 Complete Book Issuance
            </button>
          </form>
        ) : (
          <div className="verification-success-box">
            <div className="success-header">
              <span className="icon">🎉</span>
              <div>
                <h4>Book Status Updated to "Issued"</h4>
                <p>Transaction saved to central catalog database.</p>
              </div>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Transaction ID</span>
                <span className="value">#TXN-9095</span>
              </div>
              <div className="detail-item">
                <span className="label">Student</span>
                <span className="value">{studentName} ({rollNo})</span>
              </div>
              <div className="detail-item">
                <span className="label">Book Title</span>
                <span className="value">{selectedBook}</span>
              </div>
              <div className="detail-item">
                <span className="label">Due Date</span>
                <span className="value">{dueDate}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-action primary full-width"
              onClick={() => navigate("/librarian/update-stock")}
            >
              📦 Next Step: Update Stock &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianIssueBookPage;
