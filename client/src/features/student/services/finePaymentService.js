const DAY_IN_MS = 24 * 60 * 60 * 1000;
const demoFineRecords = [
  {
    id: 801,
    studentId: "demo-student",
    amount: "40.00",
    isPaid: false,
    issueDate: new Date(Date.now() - 6 * DAY_IN_MS).toISOString(),
    description: "Overdue return charge",
    fineType: { type: "Overdue return" },
    issuedBook: {
      id: 301,
      issueDate: new Date(Date.now() - 26 * DAY_IN_MS).toISOString(),
      dueDate: new Date(Date.now() - 8 * DAY_IN_MS).toISOString(),
      book: { title: "The Silent Patient", author: "Alex Michaelides", isbn: "9781250301697" },
    },
    payments: [],
  },
  {
    id: 802,
    studentId: "demo-student",
    amount: "15.00",
    isPaid: false,
    issueDate: new Date(Date.now() - 2 * DAY_IN_MS).toISOString(),
    description: "Overdue return charge",
    fineType: { type: "Overdue return" },
    issuedBook: {
      id: 302,
      issueDate: new Date(Date.now() - 15 * DAY_IN_MS).toISOString(),
      dueDate: new Date(Date.now() - 3 * DAY_IN_MS).toISOString(),
      book: { title: "Atomic Habits", author: "James Clear", isbn: "9780735211292" },
    },
    payments: [],
  },
  {
    id: 803,
    studentId: "demo-student",
    amount: "70.00",
    isPaid: false,
    issueDate: new Date(Date.now() - 10 * DAY_IN_MS).toISOString(),
    description: "Overdue return charge",
    fineType: { type: "Overdue return" },
    issuedBook: {
      id: 303,
      issueDate: new Date(Date.now() - 45 * DAY_IN_MS).toISOString(),
      dueDate: new Date(Date.now() - 14 * DAY_IN_MS).toISOString(),
      book: { title: "The Psychology of Money", author: "Morgan Housel", isbn: "9780857197689" },
    },
    payments: [],
  },
  {
    id: 804,
    studentId: "demo-student",
    amount: "25.00",
    isPaid: true,
    issueDate: new Date(Date.now() - 42 * DAY_IN_MS).toISOString(),
    description: "Overdue return charge",
    fineType: { type: "Overdue return" },
    issuedBook: {
      id: 304,
      issueDate: new Date(Date.now() - 68 * DAY_IN_MS).toISOString(),
      dueDate: new Date(Date.now() - 48 * DAY_IN_MS).toISOString(),
      book: { title: "Ikigai", author: "Hector Garcia and Francesc Miralles", isbn: "9780143130727" },
    },
    payments: [{
      id: 501,
      amountPaid: "25.00",
      paymentDate: new Date(Date.now() - 40 * DAY_IN_MS).toISOString(),
      paymentMethod: "UPI",
      transactionId: "DEMO-TXN-501",
    }],
  },
];

/**
 * Temporary backend-shaped data source. Replace this function with GET /api/fines?studentId=...
 * when student fine loading is available from the backend.
 */
export const getStudentFines = async (_studentId) =>
  demoFineRecords.map((fine) => ({
    ...fine,
    issuedBook: fine.issuedBook ? { ...fine.issuedBook, book: { ...fine.issuedBook.book } } : null,
    payments: fine.payments.map((payment) => ({ ...payment })),
  }));
