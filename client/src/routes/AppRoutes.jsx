import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import { getAuthRoutes } from "./AuthRoutes";
import { getStudentRoutes } from "./StudentRoutes";
import { getLibrarianRoutes } from "./LibrarianRoutes";

const AppRoutes = ({ user, onAuthSuccess, onLogout }) => {
  const dashboardPath =
    user?.role === "librarian" ? "/librarian-dashboard" : "/student-dashboard";

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? <Navigate to={dashboardPath} replace /> : <LandingPage />
        }
      />
      {getAuthRoutes(onAuthSuccess, user)}
      {getStudentRoutes(user, onLogout)}
      {getLibrarianRoutes(user)}
      <Route
        path="*"
        element={<Navigate to={user ? dashboardPath : "/"} replace />}
      />
    </Routes>
  );
};

export default AppRoutes;
