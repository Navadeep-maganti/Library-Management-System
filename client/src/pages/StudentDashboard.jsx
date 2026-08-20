import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/StudentDashboard.css";

const StudentDashboard = ({ user }) => {
  const navigate = useNavigate();

  const currentUser =
    user ||
    (() => {
      try {
        const stored = localStorage.getItem("libraryUser");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();

  useEffect(() => {
    if (!currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="student-dashboard-shell">
      {/* Student Profile Overview */}
      <div className="student-header-card">
        <h2 className="student-title">Student Library Dashboard</h2>
        <p className="student-sub">Welcome to your NIT AP Central Library Student Account</p>
        
        <div className="student-info-box">
          <div className="student-info-item">
            <strong>Name:</strong> {currentUser?.username || "Student User"}
          </div>
          <div className="student-info-item">
            <strong>Roll No:</strong> {currentUser?.roll_no || "N/A"}
          </div>
          <div className="student-info-item">
            <strong>Department:</strong> {currentUser?.department || "General"}
          </div>
          <div className="student-info-item">
            <strong>Year:</strong> {currentUser?.year_of_study ? `Year ${currentUser.year_of_study}` : "N/A"}
          </div>
          <div className="student-info-item">
            <strong>Email:</strong> {currentUser?.email || "student@student.nitandhra.ac.in"}
          </div>
        </div>
      </div>

      {/* Dummy Currently Borrowed Books */}
      <div className="student-section">
        <h3 className="section-heading">My Borrowed Books (Dummy Data)</h3>
        <div className="dummy-books-list">
          <div className="dummy-book-item">
            <div className="book-info">
              <h4>Introduction to Algorithms (4th Edition)</h4>
              <p>Author: Thomas H. Cormen | ISBN: 978-0262046305</p>
            </div>
            <span className="due-badge">Due: Aug 30, 2026</span>
          </div>

          <div className="dummy-book-item">
            <div className="book-info">
              <h4>Digital Logic and Computer Design</h4>
              <p>Author: M. Morris Mano | ISBN: 978-0132145107</p>
            </div>
            <span className="due-badge">Due: Sep 05, 2026</span>
          </div>

          <div className="dummy-book-item">
            <div className="book-info">
              <h4>Operating System Concepts</h4>
              <p>Author: Abraham Silberschatz | ISBN: 978-1118063330</p>
            </div>
            <span className="due-badge">Due: Sep 12, 2026</span>
          </div>
        </div>
      </div>

      {/* Dummy Library Announcements */}
      <div className="student-section">
        <h3 className="section-heading">Library Notices</h3>
        <ul className="notice-list">
          <li>Central Library reading rooms remain open 24/7 during mid-semester examination week.</li>
          <li>Digital IEEE Xplore and Springer journal access available via campus Wi-Fi network.</li>
          <li>Return borrowed items before due dates to avoid overdue library fines.</li>
        </ul>
      </div>
    </div>
  );
};

export default StudentDashboard;
