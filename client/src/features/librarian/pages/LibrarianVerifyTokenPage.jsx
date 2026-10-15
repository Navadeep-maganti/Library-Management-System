import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../styles/LibrarianVerifyTokenPage.css";

const VERIFY_ENDPOINT = "/api/reservations/verify-token";

const formatRemaining = (expiresAt, now) => {
  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const LibrarianVerifyTokenPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputToken, setInputToken] = useState(searchParams.get("token") || "");
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [issueDetails, setIssueDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [issuing, setIssuing] = useState(false);

  // Active reservations for live stats
  const [reservations, setReservations] = useState([]);
  const [now, setNow] = useState(Date.now());

  const loadReservations = useCallback(async (isSilent = false) => {
    try {
      const response = await fetch("/api/reservations");
      const data = await response.json().catch(() => ({}));
      if (data.success && Array.isArray(data.reservations)) {
        setReservations(data.reservations);
      }
    } catch (err) {
      console.error("Failed to load reservations:", err);
    }
  }, []);

  useEffect(() => {
    loadReservations();
    const interval = setInterval(() => loadReservations(true), 20000);
    return () => clearInterval(interval);
  }, [loadReservations]);

  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timerId);
  }, []);

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
    if (token) {
      setInputToken(token);
      verifyToken(token);
    }
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
      loadReservations(true);
    } catch (err) {
      setErrorMsg(err.message || "Unable to issue the reserved book.");
    } finally {
      setIssuing(false);
    }
  };

  const details = issueDetails || verificationDetails;

  return (
    <div className="verify-page-container">
      {/* Header Banner */}
      <header className="verify-header">
        <span className="verify-badge">Step 2 · Verification</span>
        <h2>Verify student reservation token</h2>
        <p>Enter the student's 6-digit reservation OTP token, review the reservation, and confirm book issuance.</p>
      </header>


      {/* Centered Main Verification Card */}
      <div className="verify-card">
        <div className="verify-card-title-box">
          <h3 className="verify-card-title">🔑 Enter Reservation Code</h3>
          <p className="verify-card-subtitle">Type student's 6-digit OTP code to retrieve book reservation.</p>
        </div>

        <form onSubmit={handleVerify} className="verify-form">
          <label htmlFor="token-input" className="verify-form-label">
            Student's 6-Digit OTP Token
          </label>
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
              {verifying ? "Verifying..." : "Validate OTP"}
            </button>
          </div>
          {errorMsg && <p className="verify-error-text" role="alert">⚠️ {errorMsg}</p>}
        </form>

        {details && (
          <div className="verify-success-box">
            <div className="verify-success-header">
              <span className="icon" aria-hidden="true">
                {issueDetails ? "🎉" : "✓"}
              </span>
              <div>
                <h4>{issueDetails ? "Book Issued Successfully!" : "Reservation Token Verified"}</h4>
                <p>
                  {issueDetails
                    ? `Transaction ${issueDetails.transactionId} has been recorded in database.`
                    : "Review student & book details below before confirming physical handover."}
                </p>
              </div>
            </div>

            <div className="verify-details-grid">
              <div className="verify-detail-item">
                <span className="label">Student Name</span>
                <span className="value">{details.studentName}</span>
              </div>
              <div className="verify-detail-item">
                <span className="label">Roll Number</span>
                <span className="value">{details.rollNo}</span>
              </div>
              <div className="verify-detail-item">
                <span className="label">Book Title</span>
                <span className="value">{details.bookTitle}</span>
              </div>
              <div className="verify-detail-item">
                <span className="label">ISBN</span>
                <span className="value">{details.isbn || "N/A"}</span>
              </div>
              {details.shelf && (
                <div className="verify-detail-item">
                  <span className="label">Shelf / Rack</span>
                  <span className="value">{details.shelf.section} ({details.shelf.rackNumber})</span>
                </div>
              )}
              {issueDetails ? (
                <div className="verify-detail-item">
                  <span className="label">Due Return Date</span>
                  <span className="value">{new Date(issueDetails.dueDate).toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="verify-detail-item">
                  <span className="label">OTP Valid Until</span>
                  <span className="value" style={{ color: "#0f766e" }}>
                    ⏱ {details.expiresAt ? formatRemaining(details.expiresAt, now) : "Active"}
                  </span>
                </div>
              )}
            </div>

            {verificationDetails && (
              <button
                type="button"
                className="verify-proceed-btn"
                onClick={handleIssueBook}
                disabled={issuing}
              >
                {issuing ? "Issuing Book & Updating Stock..." : "📖 Confirm & Issue Physical Book"}
              </button>
            )}

            {issueDetails && (
              <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="verify-proceed-btn"
                  style={{ flex: 1, margin: 0 }}
                  onClick={() => navigate("/librarian/issue-book")}
                >
                  📚 View in Issued Books Registry &rarr;
                </button>
                <button
                  type="button"
                  className="verify-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setInputToken("");
                    setIssueDetails(null);
                    setVerificationDetails(null);
                  }}
                >
                  Verify Another Token
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianVerifyTokenPage;
