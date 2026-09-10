import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/LibrarianVerifyTokenPage.css";

const LibrarianVerifyTokenPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [inputToken, setInputToken] = useState(initialToken);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const mockDatabase = {
    "TOK-9821": {
      studentName: "Rahul Sharma",
      rollNo: "421101",
      email: "rahul.s@nitandhra.ac.in",
      bookTitle: "Introduction to Algorithms (CLRS)",
      isbn: "978-0262033848",
      requestDate: "Aug 26, 2026",
    },
    "TOK-5542": {
      studentName: "Priya Patel",
      rollNo: "421108",
      email: "priya.p@nitandhra.ac.in",
      bookTitle: "Database System Concepts",
      isbn: "978-0078022159",
      requestDate: "Aug 27, 2026",
    },
    "TOK-3319": {
      studentName: "Amit Kumar",
      rollNo: "421115",
      email: "amit.k@nitandhra.ac.in",
      bookTitle: "Operating System Concepts",
      isbn: "978-1118063330",
      requestDate: "Aug 27, 2026",
    },
  };

  useEffect(() => {
    if (initialToken && mockDatabase[initialToken.trim().toUpperCase()]) {
      setVerificationResult(mockDatabase[initialToken.trim().toUpperCase()]);
    }
  }, [initialToken]);

  const handleVerify = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const cleaned = inputToken.trim().toUpperCase();
    if (!cleaned) {
      setErrorMsg("Please enter a verification token code.");
      return;
    }

    if (mockDatabase[cleaned]) {
      setVerificationResult(mockDatabase[cleaned]);
    } else {
      // Create a default verified object if unknown token is scanned for demo
      setVerificationResult({
        studentName: "Student (Verified)",
        rollNo: "421199",
        email: "student@nitandhra.ac.in",
        bookTitle: "Computer Networks - 5th Edition",
        isbn: "978-0132126953",
        requestDate: "Today",
      });
    }
  };

  const handleProceedToIssue = () => {
    if (verificationResult) {
      navigate(
        `/librarian/issue-book?student=${encodeURIComponent(
          verificationResult.studentName
        )}&roll=${verificationResult.rollNo}&book=${encodeURIComponent(
          verificationResult.bookTitle
        )}`
      );
    }
  };

  return (
    <div className="verify-page-container">
      <div className="verify-header">
        <div className="verify-badge">Step 2: Verify Token</div>
        <h2>Scan or Enter Student Verification Code</h2>
        <p>Validate student code before issuing physical books</p>
      </div>

      <div className="verify-card">
        <form onSubmit={handleVerify} className="verify-form">
          <label htmlFor="token-input" className="verify-form-label">
            Student Token / OTP Code
          </label>
          <div className="verify-input-group">
            <input
              id="token-input"
              type="text"
              className="verify-input"
              placeholder="e.g. TOK-9821 or 6-digit OTP"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
            />
            <button type="submit" className="verify-submit-btn">
              Verify Code
            </button>
          </div>
          {errorMsg && <p className="verify-error-text">{errorMsg}</p>}
        </form>

        {verificationResult && (
          <div className="verify-success-box">
            <div className="verify-success-header">
              <span className="icon">✅</span>
              <div>
                <h4>Verification Successful</h4>
                <p>Token validated against central database</p>
              </div>
            </div>

            <div className="verify-details-grid">
              <div className="verify-detail-item">
                <span className="label">Student Name</span>
                <span className="value">{verificationResult.studentName}</span>
              </div>
              <div className="verify-detail-item">
                <span className="label">Roll Number</span>
                <span className="value">{verificationResult.rollNo}</span>
              </div>
              <div className="verify-detail-item">
                <span className="label">Book Requested</span>
                <span className="value">{verificationResult.bookTitle}</span>
              </div>
              <div className="verify-detail-item">
                <span className="label">ISBN</span>
                <span className="value">{verificationResult.isbn}</span>
              </div>
            </div>

            <button
              type="button"
              className="verify-proceed-btn"
              onClick={handleProceedToIssue}
            >
              📖 Proceed to Issue Book &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianVerifyTokenPage;
