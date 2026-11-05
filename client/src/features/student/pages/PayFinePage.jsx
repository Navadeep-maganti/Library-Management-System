import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import "../styles/PayFinePage.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "").replace(/\/api$/, "");

const PayFinePage = () => {
  const { currentUser, showToast } = useOutletContext() || {};
  const rollNo = currentUser.roll_no || currentUser.rollNo || currentUser.studentId;

  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [payingId, setPayingId] = useState(null);
  const [payingAll, setPayingAll] = useState(false);

  const fetchFines = useCallback(async () => {
    if (!rollNo) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/fines?studentId=${encodeURIComponent(rollNo)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.fines)) {
        setFines(data.fines);
      }
    } catch (err) {
      console.error("Failed to fetch fines:", err);
      showToast("error", "Unable to load fine records. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [rollNo, showToast]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  const pendingFines = fines.filter((f) => !f.isPaid);
  const paidFines = fines.filter((f) => f.isPaid);

  const totalPending = pendingFines.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const totalPaid = paidFines.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  // Helper to ensure Razorpay checkout script is loaded
  const ensureRazorpayLoaded = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Pay single fine via Razorpay
  const handlePaySingle = async (fine) => {
    setPayingId(fine.id);

    try {
      const isLoaded = await ensureRazorpayLoaded();
      if (!isLoaded || !window.Razorpay) {
        throw new Error("Razorpay SDK could not be loaded. Check your internet connection.");
      }

      // 1. Create order on backend
      const res = await fetch(`${API_BASE_URL}/api/fines/${fine.id}/create-razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to initialize Razorpay order.");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Central Library NIT Andhra Pradesh",
        description: `Fine Settlement: ${fine.issuedBook?.book?.title || fine.description || "Overdue Fee"}`,
        image: "https://upload.wikimedia.org/wikipedia/en/e/ed/NIT_Andhra_Pradesh_Logo.png",
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/fines/verify-razorpay-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fineId: fine.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              showToast("success", `Payment of ₹${Number(fine.amount).toFixed(2)} received successfully! Transaction ID: ${response.razorpay_payment_id}`);
              await fetchFines();
            } else {
              showToast("error", verifyData.message || "Payment verification failed.");
            }
          } catch (verifyErr) {
            showToast("error", verifyErr.message || "Verification network error.");
          } finally {
            setPayingId(null);
          }
        },
        prefill: {
          name: currentUser.username || data.fine.studentName || "",
          email: currentUser.email || data.fine.studentEmail || "",
        },
        theme: { color: "#0f766e" },
        modal: {
          ondismiss: () => setPayingId(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (errResp) => {
        showToast("error", `Payment failed: ${errResp?.error?.description || "Transaction declined."}`);
        setPayingId(null);
      });
      rzp.open();
    } catch (err) {
      console.error("Razorpay error:", err);
      showToast("error", err.message || "Failed to launch payment checkout.");
      setPayingId(null);
    }
  };

  // Pay all pending fines at once
  const handlePayAll = async () => {
    if (!rollNo || pendingFines.length === 0) return;
    setPayingAll(true);

    try {
      const isLoaded = await ensureRazorpayLoaded();
      if (!isLoaded || !window.Razorpay) {
        throw new Error("Razorpay SDK could not be loaded. Check your internet connection.");
      }

      // 1. Create combined order on backend
      const res = await fetch(`${API_BASE_URL}/api/fines/create-all-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: rollNo }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to initialize combined payment order.");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Central Library NIT Andhra Pradesh",
        description: `Settlement of all ${data.fineIds.length} outstanding library dues`,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/fines/verify-razorpay-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fineIds: data.fineIds,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              showToast("success", `All ${data.fineIds.length} dues (₹${totalPending.toFixed(2)}) cleared successfully! Transaction ID: ${response.razorpay_payment_id}`);
              await fetchFines();
            } else {
              showToast("error", verifyData.message || "Payment verification failed.");
            }
          } catch (verifyErr) {
            showToast("error", verifyErr.message || "Verification network error.");
          } finally {
            setPayingAll(false);
          }
        },
        prefill: {
          name: currentUser.username || data.student.name || "",
          email: currentUser.email || data.student.email || "",
        },
        theme: { color: "#0f766e" },
        modal: {
          ondismiss: () => setPayingAll(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (errResp) => {
        showToast("error", `Payment failed: ${errResp?.error?.description || "Transaction declined."}`);
        setPayingAll(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Razorpay error:", err);
      showToast("error", err.message || "Failed to launch payment checkout.");
      setPayingAll(false);
    }
  };

  return (
    <div className="payfine-container">
      {/* Header */}
      <div className="payfine-header">
        <div className="payfine-title-group">
          <span className="payfine-badge-pill"> Razorpay Online Gateway</span>
          <h2>Library Fine Status & Settlement</h2>
          <p className="payfine-subtitle">
            Review overdue fees, inspect fee breakdown, and settle dues securely via UPI, Cards, or Netbanking.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="payfine-stats-grid">
        <div className="payfine-stat-card dues">
          <span className="payfine-stat-label">Total Outstanding Dues</span>
          <div className="payfine-stat-value">
            <span>₹</span>
            {totalPending.toFixed(2)}
          </div>
          <span className="payfine-stat-footnote">
            {pendingFines.length > 0 ? (
              <span className="payfine-status-pill pending">{pendingFines.length} unpaid fine(s)</span>
            ) : (
              <span className="payfine-status-pill clear">No outstanding dues</span>
            )}
          </span>
        </div>

        <div className="payfine-stat-card paid">
          <span className="payfine-stat-label">Total Fines Settled</span>
          <div className="payfine-stat-value">
            <span>₹</span>
            {totalPaid.toFixed(2)}
          </div>
          <span className="payfine-stat-footnote">
            {paidFines.length} past transaction(s) recorded
          </span>
        </div>

        <div className="payfine-stat-card standing">
          <span className="payfine-stat-label">Library Account Standing</span>
          <div className="payfine-stat-value" style={{ fontSize: "1.6rem" }}>
            {totalPending === 0 ? "Good Standing" : "Dues Pending"}
          </div>
          <span className="payfine-stat-footnote">
            {totalPending === 0 ? "Eligible to reserve & borrow books" : "Settle dues to maintain borrowing rights"}
          </span>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="payfine-tabs">
        <button
          type="button"
          className={`payfine-tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <span>Pending Dues</span>
          <span className="payfine-tab-count">{pendingFines.length}</span>
        </button>

        <button
          type="button"
          className={`payfine-tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <span>Payment Receipts</span>
          <span className="payfine-tab-count">{paidFines.length}</span>
        </button>

        <button
          type="button"
          className={`payfine-tab-btn ${activeTab === "policy" ? "active" : ""}`}
          onClick={() => setActiveTab("policy")}
        >
          <span>Fine Policy & Rates</span>
        </button>
      </div>

      {/* Tab 1: Pending Dues */}
      {activeTab === "pending" && (
        <div className="payfine-table-card">
          <div className="payfine-table-header">
            <span className="payfine-table-title">Outstanding Fine Records</span>
            {pendingFines.length > 0 && (
              <button
                type="button"
                className="payfine-pay-all-btn"
                onClick={handlePayAll}
                disabled={payingAll || payingId !== null}
              >
                <span></span>
                {payingAll ? "Processing All Dues..." : `Pay All Dues (₹${totalPending.toFixed(2)})`}
              </button>
            )}
          </div>

          {loading ? (
            <div className="payfine-empty-state">
              <span>Loading fine statements...</span>
            </div>
          ) : pendingFines.length === 0 ? (
            <div className="payfine-empty-state">
              <div className="payfine-empty-icon"></div>
              <strong className="payfine-empty-title">All Clear! No Pending Fines</strong>
              <span className="payfine-empty-desc">
                Your library account currently has zero outstanding dues. Keep returning your borrowed books on or before their due date!
              </span>
            </div>
          ) : (
            <div className="payfine-table-wrapper">
              <table className="payfine-table">
                <thead>
                  <tr>
                    <th>Fine ID</th>
                    <th>Book / Item</th>
                    <th>Reason</th>
                    <th>Date Issued</th>
                    <th>Amount</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFines.map((item) => (
                    <tr key={item.id}>
                      <td className="payfine-font-mono">#FIN-{String(item.id).padStart(4, "0")}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {item.issuedBook?.book?.title || "Central Library Book"}
                        </div>
                        {item.issuedBook?.book?.author && (
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            By {item.issuedBook.book.author}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{item.fineType?.type || "Overdue Return"}</span>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{item.description || "Overdue charge"}</div>
                      </td>
                      <td>
                        <div>{new Date(item.issueDate).toLocaleDateString()}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {new Date(item.issueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td>
                        <span className="payfine-amount">₹{Number(item.amount).toFixed(2)}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="payfine-pay-btn"
                          onClick={() => handlePaySingle(item)}
                          disabled={payingId === item.id || payingAll}
                        >
                          <span></span>
                          {payingId === item.id ? "Opening Razorpay..." : "Pay with Razorpay"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Payment Receipts */}
      {activeTab === "history" && (
        <div className="payfine-table-card">
          <div className="payfine-table-header">
            <span className="payfine-table-title">Settled Receipts & Transaction History</span>
          </div>

          {loading ? (
            <div className="payfine-empty-state">
              <span>Loading payment receipts...</span>
            </div>
          ) : paidFines.length === 0 ? (
            <div className="payfine-empty-state">
              <div className="payfine-empty-icon" style={{ background: "#f1f5f9", color: "#64748b" }}></div>
              <strong className="payfine-empty-title">No Past Transactions</strong>
              <span className="payfine-empty-desc">
                You do not have any settled fine payments recorded on your account yet.
              </span>
            </div>
          ) : (
            <div className="payfine-table-wrapper">
              <table className="payfine-table">
                <thead>
                  <tr>
                    <th>Receipt / Date</th>
                    <th>Fine Ref</th>
                    <th>Book Details</th>
                    <th>Amount Paid</th>
                    <th>Gateway Method</th>
                    <th>Transaction Ref</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paidFines.map((item) => {
                    const payment = item.payments?.[0];
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : new Date(item.issueDate).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                        </td>
                        <td className="payfine-font-mono">#FIN-{String(item.id).padStart(4, "0")}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {item.issuedBook?.book?.title || "Central Library Book"}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            {item.description || "Overdue fee"}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: "#059669" }}>
                            ₹{Number(payment.amountPaid || item.amount).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background: payment.paymentMethod === "RAZORPAY" ? "#ccfbf1" : "#f1f5f9",
                            color: payment.paymentMethod === "RAZORPAY" ? "#0f766e" : "#475569"
                          }}>
                            {payment.paymentMethod || "CASH"}
                          </span>
                        </td>
                        <td className="payfine-font-mono" style={{ fontSize: "0.8rem" }}>
                          {payment.transactionId || "--"}
                        </td>
                        <td>
                          <span className="payfine-status-pill clear"> Settled</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fine Policy */}
      {activeTab === "policy" && (
        <div className="payfine-table-card">
          <div className="payfine-table-header">
            <span className="payfine-table-title">Library Borrowing & Fine Regulations</span>
          </div>

          <div className="payfine-policy-grid">
            <div className="payfine-policy-card">
              <h4>⏱ Overdue Return Fine</h4>
              <p>
                Books returned after their specified loan period are charged at <strong>₹5.00 per day</strong> past the due date. The clock starts immediately the morning after the due date.
              </p>
            </div>

            <div className="payfine-policy-card">
              <h4> Book Renewal Window</h4>
              <p>
                Each student is allowed up to <strong>2 renewals</strong> for an issued title (extending by 7 days each), provided no other student has queued a reservation for that book.
              </p>
            </div>

            <div className="payfine-policy-card">
              <h4> Payment Gateway Information</h4>
              <p>
                Online settlements are processed securely via <strong>Razorpay</strong>. Accepted methods include UPI (Google Pay, PhonePe, Paytm), Netbanking, and Debit/Credit Cards. Receipts are issued instantaneously upon payment.
              </p>
            </div>

            <div className="payfine-policy-card">
              <h4> Maximum Borrowing Quota</h4>
              <p>
                Students may hold up to <strong>3 issued books</strong> concurrently. Having outstanding fines does not immediately revoke borrowing rights, but unpaid fines exceeding institution thresholds may pause renewals.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayFinePage;
