import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

const normalizeBook = (book) => {
  const availability = book.availabilities?.reduce(
    (total, item) => total + (item.availableCopies || 0),
    0,
  ) || 0;

  return {
    ...book,
    availableCopies: availability,
    categoryName: book.category?.name || "Uncategorized",
    departmentName: book.department?.name || "General",
  };
};

const BrowseBooksPage = () => {
  const { requests, requestBook } = useOutletContext();
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [categoriesResponse, departmentsResponse] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/departments"),
        ]);
        if (!categoriesResponse.ok || !departmentsResponse.ok) throw new Error("The catalog filters could not be loaded.");

        const [categoriesData, departmentsData] = await Promise.all([
          categoriesResponse.json(),
          departmentsResponse.json(),
        ]);
        setCategories(categoriesData.categories || []);
        setDepartments(departmentsData.departments || []);
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      limit: "12",
      order: "asc",
      sortBy: "title",
    });
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (categoryId !== "all") query.set("categoryId", categoryId);
    if (departmentId !== "all") query.set("departmentId", departmentId);

    const loadBooks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/books?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "The library catalog could not be loaded.");
        setBooks((data.books || []).map(normalizeBook));
        setError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadBooks();
    return () => controller.abort();
  }, [categoryId, departmentId, searchTerm]);

  const visibleBooks = books;

  const isRequested = (book) => requests.some(
    (request) => request.book.id === book.id && ["Requested", "Booked", "Reserved"].includes(request.status),
  );

  return (
    <main className="browse-books-page">
      <section className="browse-books-search-panel">
        <div className="browse-books-search-copy">
          <p className="student-kicker">LIBRARY CATALOG</p>
          <h1>Browse the collection</h1>
          <p>Search by title, author, or ISBN.</p>
        </div>
        <div className="browse-books-toolbar">
          <label className="browse-books-search-bar">
            <span className="browse-books-search-icon" aria-hidden="true">⌕</span>
            <span className="sr-only">Search the library catalog</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, author, or ISBN"
            />
            {searchTerm && (
              <button type="button" className="browse-books-clear" onClick={() => setSearchTerm("")} aria-label="Clear search">
                Clear
              </button>
            )}
          </label>
          <div className="browse-books-filters" aria-label="Filter books">
            <label className="browse-books-filter">
              <span>Category</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="browse-books-filter">
              <span>Department</span>
              <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="all">All departments</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <button
              type="button"
              className="browse-books-reset"
              onClick={() => {
                setCategoryId("all");
                setDepartmentId("all");
              }}
              disabled={categoryId === "all" && departmentId === "all"}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="browse-books-recommendations">
        <div className="browse-books-heading">
          <div>
            <p className="student-kicker">CURATED COLLECTION</p>
            <h2>Recommended books</h2>
            <p className="browse-books-section-note">Explore titles selected from the library collection.</p>
          </div>
          <span className="browse-books-result-count">{isLoading ? "Loading..." : `${visibleBooks.length} ${visibleBooks.length === 1 ? "title" : "titles"}`}</span>
        </div>

        {error && <div className="browse-books-message">{error}</div>}
        {!isLoading && !error && visibleBooks.length === 0 && <div className="browse-books-message">No books match your search and filters.</div>}
        <div className="book-grid browse-books-grid">
          {visibleBooks.map((book) => (
            <article className="book-card" key={book.id}>
              <div className="book-cover">{book.title.charAt(0)}</div>
              <div className="book-card-content">
                <span className="book-category">{book.categoryName}</span>
                <h3>{book.title}</h3>
                <p>By {book.author}</p>
                <div className="browse-book-meta">
                  <span>{book.departmentName}</span>
                  <strong>{book.availableCopies} available</strong>
                </div>
                <div className="browse-book-actions">
                  <button className="browse-book-details" type="button" onClick={() => setSelectedBook(book)}>
                    View details
                  </button>
                  <button className="book-button" type="button" disabled={!book.availableCopies || isRequested(book)} onClick={() => requestBook(book)}>
                    {isRequested(book) ? "Requested" : book.availableCopies ? "Request book" : "Unavailable"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedBook && (
        <div className="book-details-dialog" role="dialog" aria-modal="true" aria-label={`${selectedBook.title} details`}>
          <div className="book-details-dialog-header">
            <div>
              <span className="student-kicker">BOOK RECORD</span>
              <h2>{selectedBook.title}</h2>
            </div>
            <button type="button" aria-label="Close book details" onClick={() => setSelectedBook(null)}>×</button>
          </div>
          <p className="book-details-author">By {selectedBook.author}</p>
          {selectedBook.description && <p className="book-details-description">{selectedBook.description}</p>}
          <div className="book-details-grid">
            <div><span>Book ID</span><strong>{selectedBook.id}</strong></div>
            <div><span>ISBN</span><strong>{selectedBook.isbn || "Not available"}</strong></div>
            <div><span>Published</span><strong>{selectedBook.publishedYear || "Not available"}</strong></div>
            <div><span>Available copies</span><strong>{selectedBook.availableCopies}</strong></div>
            <div><span>Category</span><strong>{selectedBook.categoryName}</strong></div>
            <div><span>Department</span><strong>{selectedBook.departmentName}</strong></div>
            <div><span>Shelf</span><strong>{selectedBook.availabilities?.[0]?.shelf?.section || "Not assigned"}</strong></div>
            <div><span>Rack</span><strong>{selectedBook.availabilities?.[0]?.shelf?.rackNumber || "Not assigned"}</strong></div>
          </div>
        </div>
      )}
    </main>
  );
};

export default BrowseBooksPage;