import React, { useState } from "react";

const ReturnBookPage = () => {
  const [returnRequests, setReturnRequests] = useState([]);

  const issuedBooks = [
    { id: 1, title: "Clean Code", author: "Robert C. Martin", category: "Software Engineering", copies: 1, issuedOn: "20 Aug 2026", dueDate: "03 Sep 2026" },
    { id: 2, title: "Database System Concepts", author: "Abraham Silberschatz", category: "Database Systems", copies: 1, issuedOn: "22 Aug 2026", dueDate: "05 Sep 2026" },
    { id: 3, title: "The Pragmatic Programmer", author: "Andrew Hunt", category: "Programming", copies: 1, issuedOn: "25 Aug 2026", dueDate: "08 Sep 2026" },
  ];

  const sendReturnRequest = (bookId) => {
    setReturnRequests((current) => (current.includes(bookId) ? current : [...current, bookId]));
  };

  return (
    <section className="student-info-panel">
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">BOOK RETURNS</p>
          <h2>Issued Books</h2>
        </div>
        <span className="book-count">{issuedBooks.length - returnRequests.length} awaiting return</span>
      </div>
      <p className="return-guidance">Please submit each issued book to the librarian before its due date. Your return request will be verified at the library section.</p>
      <div className="issued-books-list">
        {issuedBooks.map((book) => {
          const requestSent = returnRequests.includes(book.id);
          return (
            <article className={`issued-book-card ${requestSent ? "return-request-sent" : ""}`} key={book.id}>
              <div className="issued-book-cover">{book.title.charAt(0)}</div>
              <div className="issued-book-details">
                <span className="book-category">{book.category}</span>
                <h3>{book.title}</h3>
                <p>By {book.author}</p>
                <div className="issued-book-meta">
                  <span><strong>Copies</strong>{book.copies}</span>
                  <span><strong>Issued on</strong>{book.issuedOn}</span>
                  <span><strong>Due date</strong>{book.dueDate}</span>
                </div>
                {requestSent && <p className="return-success">Return request sent. Kindly submit the book to the library section.</p>}
              </div>
              <button className="book-button" type="button" disabled={requestSent} onClick={() => sendReturnRequest(book.id)}>
                {requestSent ? "Request sent" : "Request return"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ReturnBookPage;
