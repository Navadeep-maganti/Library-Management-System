import React, { useEffect } from "react";

const StudentToast = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`student-toast student-toast-${toast.type}`} role="alert" aria-live="polite">
      <span className="student-toast-icon" aria-hidden="true">
        {toast.type === "success" ? "✓" : toast.type === "error" ? "!" : toast.type === "warning" ? "!" : "i"}
      </span>
      <span className="student-toast-message">{toast.message}</span>
      <button type="button" className="student-toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
};

export default StudentToast;
