import { useState, useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import LibrarianNavbar from "./features/librarian/components/LibrarianNavbar";
import AppRoutes from "./routes/AppRoutes";
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
        <AppRoutes
          user={user}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleLogout}
        />
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
