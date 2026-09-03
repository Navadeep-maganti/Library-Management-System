import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";

const ProfilePage = () => {
  const { currentUser } = useOutletContext();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState({
    username: currentUser.username || "Student",
    email: currentUser.email || "",
    department: currentUser.department || "General",
  });

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const saveProfile = (event) => {
    event.preventDefault();
    localStorage.setItem("libraryUser", JSON.stringify({ ...currentUser, ...draft }));
    setEditing(false);
    setSaved(true);
  };

  return (
    <section className="student-info-panel">
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">PROFILE</p>
          <h2>Student Profile</h2>
        </div>
        <button className="text-button" type="button" onClick={() => { setEditing((isEditing) => !isEditing); setSaved(false); }}>
          {editing ? "Cancel" : "Edit profile"}
        </button>
      </div>
      {saved && <p className="success-note" role="status">Profile changes saved on this device.</p>}
      {editing ? <form className="profile-form" onSubmit={saveProfile}>
        <label><span>Name</span><input value={draft.username} onChange={(event) => updateDraft("username", event.target.value)} required /></label>
        <label><span>Email</span><input type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} required /></label>
        <label><span>Department</span><input value={draft.department} onChange={(event) => updateDraft("department", event.target.value)} required /></label>
        <button className="book-button" type="submit">Save changes</button>
      </form> : <div className="student-detail-grid">
        <p>
          <strong>Name</strong>
          {draft.username}
        </p>
        <p>
          <strong>Email</strong>
          {draft.email || "Not available"}
        </p>
        <p>
          <strong>Department</strong>
          {draft.department}
        </p>
        <p>
          <strong>Roll Number</strong>
          {currentUser.roll_no || currentUser.rollNo || "Not available"}
        </p>
        <p>
          <strong>Role</strong>
          Student
        </p>
        <p>
          <strong>Library Status</strong>
          Active
        </p>
      </div>}
    </section>
  );
};

export default ProfilePage;
