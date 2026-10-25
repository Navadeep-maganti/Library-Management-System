import { useEffect } from "react";
import "../styles/LibrarianMobileDetailsModal.css";

const LibrarianMobileDetailsModal = ({ item, onClose, title, subtitle, status, fields, children }) => {
  useEffect(() => {
    if (!item) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="librarian-mobile-modal-backdrop" onClick={onClose} role="presentation">
      <section className="librarian-mobile-modal" role="dialog" aria-modal="true" aria-label={`${title} details`} onClick={(event) => event.stopPropagation()}>
        <div className="librarian-mobile-modal-header">
          <div>
            <span className="librarian-mobile-modal-kicker">Record details</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="librarian-mobile-modal-close" onClick={onClose} aria-label="Close details">×</button>
        </div>
        {status && <div className="librarian-mobile-modal-status">{status}</div>}
        <dl className="librarian-mobile-detail-list">
          {fields.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}
        </dl>
        {children && <div className="librarian-mobile-modal-actions">{children}</div>}
      </section>
    </div>
  );
};

export default LibrarianMobileDetailsModal;
