import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LibrarianNavbar from "./components/LibrarianNavbar";
import LandingPage from "./pages/LandingPage";
import RegistrationPage from "./pages/RegistrationPage";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import LibrarianDashboard from "./pages/LibrarianDashboard";
import LibrarianRequestsPage from "./pages/Librarian/LibrarianRequestsPage";
import LibrarianVerifyTokenPage from "./pages/Librarian/LibrarianVerifyTokenPage";
import LibrarianIssueBookPage from "./pages/Librarian/LibrarianIssueBookPage";
import LibrarianUpdateStockPage from "./pages/Librarian/LibrarianUpdateStockPage";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

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

  return (
    <BrowserRouter>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {user?.role === "librarian" ? (
          <LibrarianNavbar user={user} onLogout={handleLogout} />
        ) : (
          <Navbar user={user} onLogout={handleLogout} />
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
            <Route
              path="/student-dashboard"
              element={<StudentDashboard user={user} />}
            />
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
    </BrowserRouter>
  );
}

export default App;
