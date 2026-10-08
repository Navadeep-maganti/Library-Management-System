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
  const [usernameDraft, setUsernameDraft] = useState(currentUser.username || "Student");
  const [usernameNotice, setUsernameNotice] = useState("");
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordNotice, setPasswordNotice] = useState("");

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const saveProfile = (event) => {
    event.preventDefault();
    localStorage.setItem("libraryUser", JSON.stringify({ ...currentUser, ...draft }));
    setEditing(false);
    setSaved(true);
  };
  const saveUsernamePreview = (event) => {
    event.preventDefault();
    const username = usernameDraft.trim();
    if (!username) {
      setUsernameNotice("Enter a username to preview the change.");
      return;
    }

    const updatedUser = { ...currentUser, ...draft, username };
    localStorage.setItem("libraryUser", JSON.stringify(updatedUser));
    updateDraft("username", username);
    setUsernameDraft(username);
    setUsernameNotice("Username preview saved on this device only. No backend was updated.");
  };
  const previewPasswordChange = (event) => {
    event.preventDefault();
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setPasswordNotice("The new password and confirmation do not match.");
      return;
    }

    setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordNotice("Design preview only: no password was changed or saved.");
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
        <label><span>Username</span><input value={draft.username} onChange={(event) => { updateDraft("username", event.target.value); setUsernameDraft(event.target.value); }} required /></label>
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
      <div className="account-settings">
        <div className="account-settings-heading">
          <div>
            <p className="student-kicker">ACCOUNT SETTINGS</p>
            <h3>Login details</h3>
          </div>
          <p>Frontend design preview — these forms are not connected to the backend.</p>
        </div>
        <div className="account-settings-grid">
          <section className="account-setting-card" aria-labelledby="username-settings-title">
            <div className="account-setting-copy">
              <h4 id="username-settings-title">Change username</h4>
              <p>Choose the name shown on your student account.</p>
            </div>
            <form className="account-setting-form" onSubmit={saveUsernamePreview}>
              <label htmlFor="student-username">Username</label>
              <input
                autoComplete="username"
                id="student-username"
                onChange={(event) => { setUsernameDraft(event.target.value); setUsernameNotice(""); }}
                required
                value={usernameDraft}
              />
              <button className="book-button" type="submit">Preview username change</button>
              {usernameNotice && <p className="account-setting-notice" role="status">{usernameNotice}</p>}
            </form>
          </section>
          <section className="account-setting-card" aria-labelledby="password-settings-title">
            <div className="account-setting-copy">
              <h4 id="password-settings-title">Change password</h4>
              <p>Enter your current password and choose a new one.</p>
            </div>
            <form className="account-setting-form" onSubmit={previewPasswordChange}>
              <label htmlFor="student-current-password">Current password</label>
              <input
                autoComplete="current-password"
                id="student-current-password"
                onChange={(event) => { setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value })); setPasswordNotice(""); }}
                required
                type="password"
                value={passwordDraft.currentPassword}
              />
              <label htmlFor="student-new-password">New password</label>
              <input
                autoComplete="new-password"
                id="student-new-password"
                minLength={8}
                onChange={(event) => { setPasswordDraft((current) => ({ ...current, newPassword: event.target.value })); setPasswordNotice(""); }}
                required
                type="password"
                value={passwordDraft.newPassword}
              />
              <label htmlFor="student-confirm-password">Confirm new password</label>
              <input
                autoComplete="new-password"
                id="student-confirm-password"
                minLength={8}
                onChange={(event) => { setPasswordDraft((current) => ({ ...current, confirmPassword: event.target.value })); setPasswordNotice(""); }}
                required
                type="password"
                value={passwordDraft.confirmPassword}
              />
              <button className="book-button" type="submit">Preview password change</button>
              {passwordNotice && <p className="account-setting-notice" role="status">{passwordNotice}</p>}
            </form>
          </section>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
