import React from "react";
import { Route } from "react-router-dom";
import StudentDashboard from "../features/student/pages/StudentDashboard";
import PayFinePage from "../features/student/pages/PayFinePage";
import ViewHistoryPage from "../features/student/pages/ViewHistoryPage";
import RequestsPage from "../features/student/pages/RequestsPage";
import AlertsPage from "../features/student/pages/AlertsPage";
import ProfilePage from "../features/student/pages/ProfilePage";
import BrowseBooksPage from "../features/student/pages/BrowseBooksPage";

export const getStudentRoutes = (user, onLogout) => [
  <Route
    key="student-dashboard"
    path="/student-dashboard"
    element={<StudentDashboard user={user} onLogout={onLogout} />}
  >
    <Route path="payfine" element={<PayFinePage />} />
    <Route path="history" element={<ViewHistoryPage />} />
    <Route path="requests" element={<RequestsPage />} />
    <Route path="alerts" element={<AlertsPage />} />
    <Route path="profile" element={<ProfilePage />} />
    <Route path="books" element={<BrowseBooksPage />} />
  </Route>,
];

export default getStudentRoutes;
