import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/LibrarianUpdateStockPage.css";

const STOCK_ENDPOINT = (bookId) => `/api/books/${bookId}/stock`;

const getData = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.message || `Request failed (${response.status}).`);
  return data;
};

const request = async (url, options) => {
  try { return await fetch(url, options); }
  catch { throw new Error("Cannot reach the server. Start the backend and try again."); }
};

export default function LibrarianUpdateStockPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(new Set());
  const [drafts, setDrafts] = useState({});
  const [amounts, setAmounts] = useState({});
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const refresh = useCallback(async (withNotice = false) => {
    try {
      setLoading(true); setError("");
      const [bookData, issuedData] = await Promise.all([
        request("/api/books?limit=all").then(getData),
        request("/api/issued-books?isReturned=false").then(getData),
      ]);
      const issuedByBook = new Map();
      (issuedData.issuedBooks || []).forEach(({ bookId }) => issuedByBook.set(bookId, (issuedByBook.get(bookId) || 0) + 1));
      setBooks(bookData.books.map((book) => {
        const availability = book.availabilities?.[0];
        return {
          id: book.id, code: `BK-${String(book.id).padStart(4, "0")}`,
          title: book.title, author: book.author, isbn: book.isbn,
          category: book.category?.name || "General",
          shelf: availability?.shelf ? `${availability.shelf.section} (${availability.shelf.rackNumber})` : "General Stack",
          total: Number(availability?.totalCopies || 0),
          available: Number(availability?.availableCopies || 0),
          issued: issuedByBook.get(book.id) || 0,
        };
      }));
      setDrafts({});
      if (withNotice) setNotice({ type: "success", text: "Inventory refreshed from the database." });
    } catch (err) { setError(err.message || "Unable to load inventory."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { setPage(1); }, [search, category, status]);
  useEffect(() => {
    const invalidQuantity = Object.values(amounts).some((value) => {
      if (value === "") return false;
      const quantity = Number(value);
      return !Number.isInteger(quantity) || quantity < 1;
    });
    if (invalidQuantity) {
      setNotice({ type: "error", text: "Enter a whole number greater than zero." });
    }
  }, [amounts]);
  useEffect(() => {
    const clearUnsubmittedQuantity = (event) => {
      if (!event.target.matches(".stock-add-input")) return;
      const form = event.target.closest(".stock-add-form");
      if (event.relatedTarget?.closest(".stock-add-form") === form) return;
      const label = event.target.getAttribute("aria-label");
      const book = books.find((item) => label === `Copies to add to ${item.title}`);
      if (book) setAmounts((current) => ({ ...current, [book.id]: "" }));
    };

    document.addEventListener("focusout", clearUnsubmittedQuantity);
    return () => document.removeEventListener("focusout", clearUnsubmittedQuantity);
  }, [books]);
  useEffect(() => {
    const getBookFromLabel = (label) => books.find((book) => label?.endsWith(book.title));

    const confirmStepChange = (event) => {
      const button = event.target.closest(".stock-btn-step");
      if (!button) return;
      const book = getBookFromLabel(button.getAttribute("aria-label"));
      if (!book) return;
      event.preventDefault();
      event.stopPropagation();
      const change = button.classList.contains("dec") ? -1 : 1;
      setPendingUpdate({ book, total: book.total + change, change });
    };

    const confirmQuantityChange = (event) => {
      const form = event.target.closest(".stock-add-form");
      if (!form) return;
      const input = form.querySelector(".stock-add-input");
      const book = getBookFromLabel(input?.getAttribute("aria-label"));
      const quantity = Number(input?.value);
      event.preventDefault();
      event.stopPropagation();
      if (!book || !Number.isInteger(quantity) || quantity < 1) {
        setNotice({ type: "error", text: "Enter a whole number greater than zero." });
        return;
      }
      setPendingUpdate({ book, total: book.total + quantity, change: quantity });
    };

    document.addEventListener("click", confirmStepChange, true);
    document.addEventListener("submit", confirmQuantityChange, true);
    return () => {
      document.removeEventListener("click", confirmStepChange, true);
      document.removeEventListener("submit", confirmQuantityChange, true);
    };
  }, [books]);

  const save = async (book, total) => {
    if (!Number.isInteger(total) || total < book.issued) { setNotice({ type: "error", text: `Total stock cannot be lower than the ${book.issued} copies currently on loan.` }); return; }
    if (total === book.total) { setDrafts((old) => { const next = { ...old }; delete next[book.id]; return next; }); return; }
    setSaving((old) => new Set(old).add(book.id)); setNotice(null);
    try {
      const data = await getData(await request(STOCK_ENDPOINT(book.id), {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ totalCopies: total }),
      }));
      setBooks((old) => old.map((item) => item.id === book.id ? { ...item, total: data.availability.totalCopies, available: data.availability.availableCopies } : item));
      setDrafts((old) => { const next = { ...old }; delete next[book.id]; return next; });
      setNotice(`Stock saved for “${book.title}”.`);
    } catch (err) {
      setNotice({
        type: "error",
        text: err.message.includes("404")
          ? "Stock was not saved: the backend needs PATCH /api/books/:id/stock."
          : (err.message || "Unable to save stock."),
      });
    }
    finally { setSaving((old) => { const next = new Set(old); next.delete(book.id); return next; }); }
  };

  const stats = useMemo(() => ({
    titles: books.length, copies: books.reduce((n, b) => n + b.total, 0), available: books.reduce((n, b) => n + b.available, 0), issued: books.reduce((n, b) => n + b.issued, 0), low: books.filter((b) => b.available > 0 && b.available <= 2).length,
  }), [books]);
  const categories = useMemo(() => [...new Set(books.map((b) => b.category))].sort(), [books]);
  const filtered = useMemo(() => books.filter((book) => {
    const q = search.trim().toLowerCase();
    const text = [book.title, book.author, book.isbn, book.code].some((value) => value.toLowerCase().includes(q));
    const stock = status === "all" || (status === "available" && book.available > 2) || (status === "low" && book.available > 0 && book.available <= 2) || (status === "out" && book.available === 0);
    return (!q || text) && (category === "all" || category === book.category) && stock;
  }), [books, search, category, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pages);
  const rows = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  return <>
    {pendingUpdate && <div className="stock-confirm-backdrop" role="presentation">
      <section className="stock-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="stock-confirm-title">
        <p className="stock-confirm-kicker">Confirm stock update</p>
        <h2 id="stock-confirm-title">Update “{pendingUpdate.book.title}”?</h2>
        <p>You are about to {pendingUpdate.change > 0 ? "add" : "remove"} <strong>{Math.abs(pendingUpdate.change)}</strong> cop{Math.abs(pendingUpdate.change) === 1 ? "y" : "ies"}. The total will change from <strong>{pendingUpdate.book.total}</strong> to <strong>{pendingUpdate.total}</strong>.</p>
        <div className="stock-confirm-actions">
          <button type="button" className="stock-confirm-cancel" onClick={() => setPendingUpdate(null)}>Cancel</button>
          <button type="button" className="stock-confirm-save" onClick={() => { save(pendingUpdate.book, pendingUpdate.total); setAmounts((current) => ({ ...current, [pendingUpdate.book.id]: "" })); setPendingUpdate(null); }}>Confirm update</button>
        </div>
      </section>
    </div>}
    <main className="stock-page-container">
    <header className="stock-header"><span className="stock-badge">Step 4 · Inventory</span><h1>Update book stock</h1><p>Changes save directly to the database. Stock cannot be reduced below copies currently on loan.</p></header>
    <section className="stock-metrics-grid" aria-label="Inventory summary">
      {[['Titles', stats.titles, ''], ['Physical copies', stats.copies, ''], ['Available now', stats.available, 'avail'], ['On loan', stats.issued, 'issued'], ['Low stock', stats.low, 'low']].map(([label, value, tone]) => <div className="stock-metric-card" key={label}><span className="stock-metric-label">{label}</span><strong className={`stock-metric-val ${tone}`}>{value}</strong></div>)}
    </section>
    <section className="stock-main-card">
      <div className="stock-card-header"><div><h2>Catalog inventory</h2><p>{filtered.length} of {books.length} titles</p></div><button type="button" className="stock-btn-sync" disabled={loading} onClick={() => refresh(true)}>{loading ? "Refreshing…" : "Refresh inventory"}</button></div>
      {notice && <div className={`stock-sync-alert ${notice.type === "error" ? "stock-alert-error" : ""}`} role="status">{typeof notice === "string" ? notice : notice.text}</div>}
      <div className="stock-filter-bar"><input className="stock-search-input" aria-label="Search catalog" placeholder="Search title, author, ISBN, or ID" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="stock-select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map((name) => <option key={name}>{name}</option>)}</select><select className="stock-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All stock</option><option value="available">Available</option><option value="low">Low stock (1–2)</option><option value="out">Out of stock</option></select></div>
      {loading ? <div className="stock-empty-state"><p>Loading inventory…</p></div> : error ? <div className="stock-empty-state stock-error"><p>{error}</p><button type="button" className="stock-btn-sync" onClick={() => refresh()}>Try again</button></div> : !rows.length ? <div className="stock-empty-state"><p>No books match these filters.</p></div> : <div className="stock-table-responsive"><table className="stock-table"><thead><tr><th>Book</th><th>Category / shelf</th><th>Total</th><th>Available</th><th>Issued</th><th>Adjust</th></tr></thead><tbody>{rows.map((book) => { const busy = saving.has(book.id); return <tr key={book.id}><td><span className="stock-font-mono">{book.code}</span><strong>{book.title}</strong><span className="stock-sub-text">{book.author} · ISBN {book.isbn}</span></td><td><span className="stock-category-badge">{book.category}</span><span className="stock-shelf-tag">{book.shelf}</span></td><td><input className="stock-input-total" type="number" min={book.issued} disabled={busy} value={drafts[book.id] ?? book.total} onChange={(e) => setDrafts((old) => ({ ...old, [book.id]: e.target.value }))} onBlur={(e) => save(book, Number(e.target.value))} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label={`Total stock for ${book.title}`} /></td><td><span className={`stock-count-pill avail ${book.available === 0 ? 'zero' : ''}`}>{book.available}</span></td><td><span className="stock-count-pill issued">{book.issued}</span></td><td><div className="stock-adjust-group"><button type="button" className="stock-btn-step dec" disabled={busy || book.total <= book.issued} onClick={() => save(book, book.total - 1)} aria-label={`Remove one copy of ${book.title}`}>−</button><button type="button" className="stock-btn-step" disabled={busy} onClick={() => save(book, book.total + 1)} aria-label={`Add one copy of ${book.title}`}>+</button><form className="stock-add-form" onSubmit={(e) => { e.preventDefault(); const qty = Number(amounts[book.id]); if (Number.isInteger(qty) && qty > 0) { save(book, book.total + qty); setAmounts((old) => ({ ...old, [book.id]: '' })); } }}><input className="stock-add-input" type="number" min="1" placeholder="Qty" disabled={busy} value={amounts[book.id] || ''} onChange={(e) => setAmounts((old) => ({ ...old, [book.id]: e.target.value }))} aria-label={`Copies to add to ${book.title}`} /><button type="submit" className="stock-add-btn" disabled={busy}>Add</button></form></div></td></tr>; })}</tbody></table></div>}
      {!loading && !error && filtered.length > pageSize && <div className="stock-pagination-bar"><span className="stock-page-info">Page {activePage} of {pages}</span><div className="stock-pagination-controls"><button type="button" className="stock-page-btn" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>Previous</button><button type="button" className="stock-page-btn" disabled={activePage === pages} onClick={() => setPage(activePage + 1)}>Next</button></div></div>}
    </section>
    </main>
  </>;
}
