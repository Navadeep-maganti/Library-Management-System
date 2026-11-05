import React from "react";
import { Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
import RegistrationPage from "../features/auth/pages/RegistrationPage";

export const getAuthRoutes = (onAuthSuccess, user) => {
  const dashboardPath =
    user?.role === "librarian" ? "/librarian-dashboard" : "/student-dashboard";

  return [
    <Route
      key="register"
      path="/register"
      element={
        user ? (
          <Navigate to={dashboardPath} replace />
        ) : (
          <RegistrationPage onAuthSuccess={onAuthSuccess} />
        )
      }
    />,
    <Route
      key="login"
      path="/login"
      element={
        user ? (
          <Navigate to={dashboardPath} replace />
        ) : (
          <LoginPage onAuthSuccess={onAuthSuccess} />
        )
      }
    />,
  ];
};

export default getAuthRoutes;
