import { useState, useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import LibrarianNavbar from "./features/librarian/components/LibrarianNavbar";
import AppRoutes from "./routes/AppRoutes";
import "./App.css";

const readStoredUser = () => {
  const storedUser = localStorage.getItem("libraryUser");
  const token = localStorage.getItem("libraryToken");

  if (!storedUser || !token) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("libraryUser");
    return null;
  }
};

function AppContent() {
  const [user, setUser] = useState(readStoredUser);
  const location = useLocation();

  useEffect(() => {
    const syncAuthState = () => setUser(readStoredUser());

    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
    };
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
