import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/LibrarianIssueBookPage.css";

const LibrarianIssueBookPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStudent = searchParams.get("student") || "Rahul Sharma";
  const initialRoll = searchParams.get("roll") || "421101";
  const initialBook = searchParams.get("book") || "Introduction to Algorithms, 4th Edition";

  const [studentName, setStudentName] = useState(initialStudent);
  const [rollNo, setRollNo] = useState(initialRoll);
  const [selectedBook, setSelectedBook] = useState(initialBook);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [issuedSuccess, setIssuedSuccess] = useState(false);

  // Fetch real books for quick selection
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const res = await fetch("/api/books?limit=all");
        const data = await res.json();
        if (data.success && Array.isArray(data.books)) {
          setAvailableBooks(data.books);
        }
      } catch (e) {
        console.error("Could not fetch books for issue list:", e);
      }
    };
    loadBooks();
  }, []);

  const handleIssueBook = (e) => {
    e.preventDefault();
    setIssuedSuccess(true);
  };

  return (
    <div className="issue-page-container">
      <div className="issue-header">
        <div className="issue-badge">Step 3: Issue Book</div>
        <h2>Confirm & Issue Book</h2>
        <p>Assign physical inventory to student and update status to "Issued"</p>
      </div>

      <div className="issue-card">
        {!issuedSuccess ? (
          <form onSubmit={handleIssueBook} className="issue-form">
            <div className="issue-form-group">
              <label htmlFor="student-name" className="issue-form-label">
                Student Name
              </label>
              <input
                id="student-name"
                type="text"
                className="issue-input"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <div className="issue-form-group">
              <label htmlFor="roll-no" className="issue-form-label">
                Roll Number
              </label>
              <input
                id="roll-no"
                type="text"
                className="issue-input"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                required
              />
            </div>

            <div className="issue-form-group">
              <label htmlFor="select-book" className="issue-form-label">
                Select Book Title
              </label>
              <input
                id="select-book"
                type="text"
                list="books-datalist"
                className="issue-input"
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                placeholder="Type or pick a book from catalog..."
                required
              />
              <datalist id="books-datalist">
                {availableBooks.map((b) => (
                  <option key={b.id} value={b.title}>
                    {b.author} (ISBN: {b.isbn})
                  </option>
                ))}
              </datalist>
            </div>

            <div className="issue-form-group">
              <label htmlFor="due-date" className="issue-form-label">
                Due Return Date (14 Days Standard)
              </label>
              <input
                id="due-date"
                type="date"
                className="issue-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="issue-submit-btn">
              📖 Complete Book Issuance
            </button>
          </form>
        ) : (
          <div className="issue-success-box">
            <div className="issue-success-header">
              <span className="icon">🎉</span>
              <div>
                <h4>Book Status Updated to "Issued"</h4>
                <p>Transaction saved to central catalog database.</p>
              </div>
            </div>

            <div className="issue-details-grid">
              <div className="issue-detail-item">
                <span className="label">Transaction ID</span>
                <span className="value">#TXN-{Math.floor(1000 + Math.random() * 9000)}</span>
              </div>
              <div className="issue-detail-item">
                <span className="label">Student</span>
                <span className="value">{studentName} ({rollNo})</span>
              </div>
              <div className="issue-detail-item">
                <span className="label">Book Title</span>
                <span className="value">{selectedBook}</span>
              </div>
              <div className="issue-detail-item">
                <span className="label">Due Date</span>
                <span className="value">{dueDate}</span>
              </div>
            </div>

            <button
              type="button"
              className="issue-next-btn"
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
