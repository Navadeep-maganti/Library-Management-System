import React from "react";
import { Route } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
import RegistrationPage from "../features/auth/pages/RegistrationPage";

export const getAuthRoutes = (onAuthSuccess) => [
  <Route
    key="register"
    path="/register"
    element={<RegistrationPage onAuthSuccess={onAuthSuccess} />}
  />,
  <Route
    key="login"
    path="/login"
    element={<LoginPage onAuthSuccess={onAuthSuccess} />}
  />,
];

export default getAuthRoutes;
