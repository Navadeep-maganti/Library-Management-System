import React from "react";
import { Route } from "react-router-dom";
import LibrarianDashboard from "../features/librarian/pages/LibrarianDashboard";
import LibrarianRequestsPage from "../features/librarian/pages/LibrarianRequestsPage";
import LibrarianVerifyTokenPage from "../features/librarian/pages/LibrarianVerifyTokenPage";
import LibrarianIssueBookPage from "../features/librarian/pages/LibrarianIssueBookPage";
import LibrarianUpdateStockPage from "../features/librarian/pages/LibrarianUpdateStockPage";

export const getLibrarianRoutes = (user) => [
  <Route
    key="librarian-dashboard"
    path="/librarian-dashboard"
    element={<LibrarianDashboard user={user} />}
  />,
  <Route
    key="librarian-requests"
    path="/librarian/requests"
    element={<LibrarianRequestsPage />}
  />,
  <Route
    key="librarian-verify-token"
    path="/librarian/verify-token"
    element={<LibrarianVerifyTokenPage />}
  />,
  <Route
    key="librarian-issue-book"
    path="/librarian/issue-book"
    element={<LibrarianIssueBookPage />}
  />,
  <Route
    key="librarian-update-stock"
    path="/librarian/update-stock"
    element={<LibrarianUpdateStockPage />}
  />,
];

export default getLibrarianRoutes;
