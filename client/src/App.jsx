import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import LibrarianNavbar from "./components/LibrarianNavbar";
import LandingPage from "./pages/LandingPage";
import RegistrationPage from "./pages/auth/RegistrationPage";
import LoginPage from "./pages/auth/LoginPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import PayFinePage from "./pages/student/PayFinePage";
import ViewHistoryPage from "./pages/student/ViewHistoryPage";
import ReturnBookPage from "./pages/student/ReturnBookPage";
import AlertsPage from "./pages/student/AlertsPage";
import ProfilePage from "./pages/student/ProfilePage";
import RequestsPage from "./pages/student/RequestsPage";
import LibrarianDashboard from "./pages/Librarian/LibrarianDashboard";
import LibrarianRequestsPage from "./pages/Librarian/LibrarianRequestsPage";
import LibrarianVerifyTokenPage from "./pages/Librarian/LibrarianVerifyTokenPage";
import LibrarianIssueBookPage from "./pages/Librarian/LibrarianIssueBookPage";
import LibrarianUpdateStockPage from "./pages/Librarian/LibrarianUpdateStockPage";
import "./App.css";

function AppContent() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem("libraryUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("libraryUser");
      }
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("libraryToken");
    localStorage.removeItem("libraryUser");
    setUser(null);
  };

  const isStudentDashboard = location.pathname.startsWith("/student-dashboard");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {!isStudentDashboard && (
        user?.role === "librarian" ? (
          <LibrarianNavbar user={user} onLogout={handleLogout} />
        ) : (
          <Navbar user={user} onLogout={handleLogout} />
        )
      )}
      
      <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/register"
              element={<RegistrationPage onAuthSuccess={handleAuthSuccess} />}
            />
            <Route
              path="/login"
              element={<LoginPage onAuthSuccess={handleAuthSuccess} />}
            />
            <Route path="/student-dashboard" element={<StudentDashboard user={user} onLogout={handleLogout} />}>
              <Route path="payfine" element={<PayFinePage />} />
              <Route path="history" element={<ViewHistoryPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="return" element={<ReturnBookPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route
              path="/librarian-dashboard"
              element={<LibrarianDashboard user={user} />}
            />
            <Route
              path="/librarian/requests"
              element={<LibrarianRequestsPage />}
            />
            <Route
              path="/librarian/verify-token"
              element={<LibrarianVerifyTokenPage />}
            />
            <Route
              path="/librarian/issue-book"
              element={<LibrarianIssueBookPage />}
            />
            <Route
              path="/librarian/update-stock"
              element={<LibrarianUpdateStockPage />}
            />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <span>© 2026 Central Library Management System</span>
            <span>Secure Domain OTP & Role-Based Access Control</span>
          </div>
        </footer>
      </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
