import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/LibrarianVerifyTokenPage.css";

const VERIFY_ENDPOINT = "/api/reservations/verify-token";

const LibrarianVerifyTokenPage = () => {
  const [searchParams] = useSearchParams();
  const [inputToken, setInputToken] = useState(searchParams.get("token") || "");
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [issueDetails, setIssueDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const callVerificationApi = async (body) => {
    const response = await fetch(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to verify the reservation token.");
    return data;
  };

  const verifyToken = async (token) => {
    const cleanedToken = token.trim();
    if (!cleanedToken) {
      setErrorMsg("Enter the student's 6-digit reservation token.");
      return;
    }

    setVerifying(true);
    setErrorMsg("");
    setVerificationDetails(null);
    setIssueDetails(null);
    try {
      const data = await callVerificationApi({ token: cleanedToken, verifyOnly: true });
      setVerificationDetails(data.verificationDetails);
    } catch (err) {
      setErrorMsg(err.message || "Unable to verify the reservation token.");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) verifyToken(token);
    // The token comes only from the URL when this page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleVerify = (event) => {
    event.preventDefault();
    verifyToken(inputToken);
  };

  const handleIssueBook = async () => {
    if (!verificationDetails) return;

    setIssuing(true);
    setErrorMsg("");
    try {
      const data = await callVerificationApi({ token: inputToken.trim() });
      setIssueDetails(data.issueDetails);
      setVerificationDetails(null);
    } catch (err) {
      setErrorMsg(err.message || "Unable to issue the reserved book.");
    } finally {
      setIssuing(false);
    }
  };

  const details = issueDetails || verificationDetails;

  return (
    <div className="verify-page-container">
      <div className="verify-header">
        <div className="verify-badge">Verify reservation</div>
        <h2>Verify Student Reservation Token</h2>
        <p>Enter the student's 6-digit token, review the reservation, then confirm the book issue.</p>
      </div>

      <div className="verify-card">
        <form onSubmit={handleVerify} className="verify-form">
          <label htmlFor="token-input" className="verify-form-label">Student's 6-digit reservation token</label>
          <div className="verify-input-group">
            <input
              id="token-input"
              type="text"
              inputMode="numeric"
              maxLength="6"
              className="verify-input"
              placeholder="e.g. 100042"
              value={inputToken}
              onChange={(event) => setInputToken(event.target.value.replace(/\D/g, ""))}
              disabled={verifying || issuing}
              required
            />
            <button type="submit" className="verify-submit-btn" disabled={verifying || issuing}>
              {verifying ? "Verifying..." : "Verify Token"}
            </button>
          </div>
          {errorMsg && <p className="verify-error-text" role="alert">{errorMsg}</p>}
        </form>

        {details && (
          <div className="verify-success-box">
            <div className="verify-success-header">
              <span className="icon" aria-hidden="true">✓</span>
              <div>
                <h4>{issueDetails ? "Book Issued Successfully" : "Reservation Verified"}</h4>
                <p>{issueDetails ? `Transaction ${issueDetails.transactionId} has been recorded.` : "Confirm the student and booked book before issuing."}</p>
              </div>
            </div>

            <div className="verify-details-grid">
              <div className="verify-detail-item"><span className="label">Student Name</span><span className="value">{details.studentName}</span></div>
              <div className="verify-detail-item"><span className="label">Roll Number</span><span className="value">{details.rollNo}</span></div>
              <div className="verify-detail-item"><span className="label">Email</span><span className="value">{details.email}</span></div>
              <div className="verify-detail-item"><span className="label">Book</span><span className="value">{details.bookTitle}</span></div>
              <div className="verify-detail-item"><span className="label">ISBN</span><span className="value">{details.isbn}</span></div>
              {issueDetails && <div className="verify-detail-item"><span className="label">Due Date</span><span className="value">{new Date(issueDetails.dueDate).toLocaleDateString()}</span></div>}
            </div>

            {verificationDetails && (
              <button type="button" className="verify-proceed-btn" onClick={handleIssueBook} disabled={issuing}>
                {issuing ? "Issuing Book..." : "Confirm & Issue Book"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianVerifyTokenPage;
