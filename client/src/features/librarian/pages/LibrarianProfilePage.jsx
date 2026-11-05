import React, { useState } from "react";
import "../styles/LibrarianProfilePage.css";

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

const requestProfileApi = async (path, method, body) => {
  const token = localStorage.getItem("libraryToken");
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) },
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || "The request could not be completed.");
  return data;
};

const LibrarianProfilePage = ({ user, onUserUpdated }) => {
  const [draft, setDraft] = useState({ username: user?.username || "", email: user?.email || "" });
  const [profileNotice, setProfileNotice] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordNotice, setPasswordNotice] = useState("");

  const storeProfile = (data) => {
    const updatedUser = { ...user, ...(data.profile || data.user) };
    localStorage.setItem("libraryUser", JSON.stringify(updatedUser));
    if (data.token) localStorage.setItem("libraryToken", data.token);
    onUserUpdated?.(updatedUser);
    setDraft({ username: updatedUser.username || "", email: updatedUser.email || "" });
  };

  const saveUsername = async () => {
    setProfileBusy(true);
    try {
      const data = await requestProfileApi("/api/profile/username", "PATCH", { username: draft.username });
      storeProfile(data);
      setProfileNotice(data.message || "Username updated successfully.");
    } catch (error) {
      setProfileNotice(error.message);
    } finally {
      setProfileBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setPasswordNotice("The new password and confirmation do not match.");
      return;
    }
    if (!PASSWORD_RULE.test(passwordDraft.newPassword)) {
      setPasswordNotice("Password must be at least 8 characters and include 1 uppercase letter and 1 special character.");
      return;
    }
    setProfileBusy(true);
    try {
      const data = await requestProfileApi("/api/profile/password", "PATCH", passwordDraft);
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordNotice(data.message);
    } catch (error) {
      setPasswordNotice(error.message);
    } finally {
      setProfileBusy(false);
    }
  };

  return (
    <section className="librarian-profile-page">
      <div className="librarian-profile-heading">
        <div><p className="librarian-profile-kicker">PROFILE</p><h1>Librarian Profile</h1></div>
      </div>
      {profileNotice && <p className="librarian-profile-page-notice" role="alert">{profileNotice}</p>}
      <div className="librarian-profile-details">
        <p><strong>Name</strong>{draft.username || "Not available"}</p>
        <p><strong>Email</strong>{draft.email || "Not available"}</p>
        <p><strong>Staff ID</strong>{user?.staff_id || user?.staffId || "Not available"}</p>
        <p><strong>Role</strong>Librarian</p>
        <p><strong>Library status</strong>Active</p>
      </div>
      <div className="librarian-account-settings">
        <div className="librarian-account-settings-heading"><div><p className="librarian-profile-kicker">ACCOUNT SETTINGS</p><h2>Login details</h2></div><p>Update your username and password for your library account.</p></div>
        <div className="librarian-account-settings-grid">
          <section className="librarian-account-card">
            <h3>Change username</h3><p>Choose the name shown on your librarian account.</p>
            <input minLength={2} maxLength={255} value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} />
            <button type="button" onClick={saveUsername} disabled={profileBusy}>{profileBusy ? "Saving..." : "Confirm change"}</button>
          </section>
          <section className="librarian-account-card">
            <h3>Change password</h3><p>Enter your current password, then choose a new password.</p>
            {passwordNotice && <p className="librarian-profile-page-notice" role="alert">{passwordNotice}</p>}
            <form className="librarian-password-form" onSubmit={savePassword}><input type="password" placeholder="Current password" value={passwordDraft.currentPassword} onChange={(event) => setPasswordDraft({ ...passwordDraft, currentPassword: event.target.value })} required /><input type="password" placeholder="New password" value={passwordDraft.newPassword} onChange={(event) => setPasswordDraft({ ...passwordDraft, newPassword: event.target.value })} required /><input type="password" placeholder="Confirm new password" value={passwordDraft.confirmPassword} onChange={(event) => setPasswordDraft({ ...passwordDraft, confirmPassword: event.target.value })} required /><button type="submit" disabled={profileBusy}>{profileBusy ? "Saving..." : "Save password"}</button></form>
          </section>
        </div>
      </div>
    </section>
  );
};

export default LibrarianProfilePage;
