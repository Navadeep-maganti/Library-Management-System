import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import { getAuthRoutes } from "./AuthRoutes";
import { getStudentRoutes } from "./StudentRoutes";
import { getLibrarianRoutes } from "./LibrarianRoutes";

const AppRoutes = ({ user, onAuthSuccess, onLogout }) => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {getAuthRoutes(onAuthSuccess)}
      {getStudentRoutes(user, onLogout)}
      {getLibrarianRoutes(user)}
    </Routes>
  );
};

export default AppRoutes;
