import React from "react";

const StudentLoadingOverlay = ({ active, label = "Loading your library data" }) => {
  if (!active) return null;

  return (
    <div className="student-loading-overlay" role="status" aria-live="polite">
      <div className="student-loading-card">
        <span className="student-loading-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
};

export default StudentLoadingOverlay;
