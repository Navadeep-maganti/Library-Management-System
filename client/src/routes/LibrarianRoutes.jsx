import React from "react";
import { Route } from "react-router-dom";
import LibrarianDashboard from "../features/librarian/pages/LibrarianDashboard";
import LibrarianReservationsPage from "../features/librarian/pages/LibrarianReservationsPage";
import LibrarianVerifyTokenPage from "../features/librarian/pages/LibrarianVerifyTokenPage";
import LibrarianIssueBookPage from "../features/librarian/pages/LibrarianIssueBookPage";
import LibrarianUpdateStockPage from "../features/librarian/pages/LibrarianUpdateStockPage";
import LibrarianFinesPage from "../features/librarian/pages/LibrarianFinesPage";
import LibrarianProfilePage from "../features/librarian/pages/LibrarianProfilePage";
import LibrarianAlertsPage from "../features/librarian/pages/LibrarianAlertsPage";
import ProtectedRoute from "./ProtectedRoute";

export const getLibrarianRoutes = (user, onUserUpdated) => [
  <Route
    key="librarian-dashboard"
    path="/librarian-dashboard"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianDashboard user={user} />
      </ProtectedRoute>
    }
  />,
  <Route
    key="librarian-reservations"
    path="/librarian/reservations"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianReservationsPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="librarian-verify-token"
    path="/librarian/verify-token"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianVerifyTokenPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="librarian-issue-book"
    path="/librarian/issue-book"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianIssueBookPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="librarian-update-stock"
    path="/librarian/update-stock"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianUpdateStockPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="librarian-fines"
    path="/librarian/fines"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianFinesPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="librarian-profile"
    path="/librarian/profile"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianProfilePage user={user} onUserUpdated={onUserUpdated} />
      </ProtectedRoute>
    }
  />,
  <Route
    key="librarian-alerts"
    path="/librarian/alerts"
    element={
      <ProtectedRoute user={user} allowedRole="librarian">
        <LibrarianAlertsPage />
      </ProtectedRoute>
    }
  />,
];

export default getLibrarianRoutes;
