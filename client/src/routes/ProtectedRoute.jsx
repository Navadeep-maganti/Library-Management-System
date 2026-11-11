import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ user, allowedRole, children }) => {
  const location = useLocation();
  const token = localStorage.getItem("libraryToken");

  if (!user || !token) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === "librarian" ? "/librarian-dashboard" : "/student-dashboard"}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
