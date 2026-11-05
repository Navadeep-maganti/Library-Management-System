import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "").replace(/\/api$/, "");
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

const requestProfileApi = async (path, method, body) => {
  const token = localStorage.getItem("libraryToken");
  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body && { "Content-Type": "application/json" }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "The request could not be completed.");
  }

  return data;
};

const ProfilePage = () => {
  const { currentUser, onUserUpdated, showToast } = useOutletContext();
  const [editing, setEditing] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [draft, setDraft] = useState({
    username: currentUser.username || "Student",
    email: currentUser.email || "",
    department: currentUser.department || "General",
    yearOfStudy: currentUser.yearOfStudy || currentUser.year_of_study || "",
  });
  const [usernameDraft, setUsernameDraft] = useState(currentUser.username || "Student");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordBusy, setPasswordBusy] = useState(false);

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const storeUpdatedProfile = (profile, token) => {
    const updatedUser = { ...currentUser, ...profile };
    localStorage.setItem("libraryUser", JSON.stringify(updatedUser));
    if (token) localStorage.setItem("libraryToken", token);
    onUserUpdated?.(updatedUser);
    setDraft((current) => ({
      ...current,
      username: updatedUser.username || current.username,
      email: updatedUser.email || current.email,
      department: updatedUser.department || current.department,
      yearOfStudy: updatedUser.yearOfStudy || updatedUser.year_of_study || current.yearOfStudy,
    }));
    setUsernameDraft(updatedUser.username || "");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileBusy(true);
    try {
      const result = await requestProfileApi("/api/profile", "PUT", {
        username: draft.username,
        department: draft.department,
        yearOfStudy: draft.yearOfStudy,
      });
      storeUpdatedProfile(result.profile || result.user, result.token);
      setEditing(false);
      showToast("success", "Profile changes saved successfully.");
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setProfileBusy(false);
    }
  };

  const saveUsername = async (event) => {
    event.preventDefault();
    const username = usernameDraft.trim();
    if (username.length < 2 || username.length > 255) {
      showToast("warning", "Username must be between 2 and 255 characters.");
      return;
    }

    setUsernameBusy(true);
    try {
      const result = await requestProfileApi("/api/profile/username", "PATCH", { username });
      storeUpdatedProfile(result.profile || result.user, result.token);
      updateDraft("username", username);
      showToast("success", result.message || "Username updated successfully.");
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setUsernameBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      showToast("warning", "The new password and confirmation do not match.");
      return;
    }
    if (!PASSWORD_RULE.test(passwordDraft.newPassword)) {
      showToast("warning", "Password must be at least 8 characters and include 1 uppercase letter and 1 special character.");
      return;
    }

    setPasswordBusy(true);
    try {
      const result = await requestProfileApi("/api/profile/password", "PATCH", {
        currentPassword: passwordDraft.currentPassword,
        newPassword: passwordDraft.newPassword,
        confirmPassword: passwordDraft.confirmPassword,
      });
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("success", result.message || "Password updated successfully.");
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <section className="student-info-panel">
      <div className="catalog-heading">
        <div>
          <p className="student-kicker">PROFILE</p>
          <h2>Student Profile</h2>
        </div>
        <button className="text-button" type="button" onClick={() => setEditing((isEditing) => !isEditing)}>
          {editing ? "Cancel" : "Edit profile"}
        </button>
      </div>
      {editing ? <form className="profile-form" onSubmit={saveProfile}>
        <label><span>Username</span><input minLength={2} maxLength={255} value={draft.username} onChange={(event) => { updateDraft("username", event.target.value); setUsernameDraft(event.target.value); }} required /></label>
        <label><span>Email</span><input type="email" value={draft.email} readOnly /></label>
        <label><span>Department</span><input value={draft.department} onChange={(event) => updateDraft("department", event.target.value)} required /></label>
        <label><span>Year of study</span><input type="number" min="1" max="6" value={draft.yearOfStudy} onChange={(event) => updateDraft("yearOfStudy", event.target.value)} required /></label>
        <button className="book-button" type="submit" disabled={profileBusy}>{profileBusy ? "Saving..." : "Save changes"}</button>
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
          <strong>Year of Study</strong>
          {currentUser.yearOfStudy || currentUser.year_of_study || "Not available"}
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
          <p>Update your username and password for your library account.</p>
        </div>
        <div className="account-settings-grid">
          <section className="account-setting-card" aria-labelledby="username-settings-title">
            <div className="account-setting-copy">
              <h4 id="username-settings-title">Change username</h4>
              <p>Choose the name shown on your student account.</p>
            </div>
            <form className="account-setting-form" onSubmit={saveUsername}>
              <label htmlFor="student-username">Username</label>
              <input
                autoComplete="username"
                id="student-username"
                maxLength={255}
                minLength={2}
                onChange={(event) => setUsernameDraft(event.target.value)}
                required
                value={usernameDraft}
              />
              <button className="book-button" type="submit" disabled={usernameBusy}>{usernameBusy ? "Updating..." : "Update username"}</button>
            </form>
          </section>
          <section className="account-setting-card" aria-labelledby="password-settings-title">
            <div className="account-setting-copy">
              <h4 id="password-settings-title">Change password</h4>
              <p>Enter your current password and choose a new one.</p>
            </div>
            <form className="account-setting-form" onSubmit={changePassword}>
              <label htmlFor="student-current-password">Current password</label>
              <input
                autoComplete="current-password"
                id="student-current-password"
                onChange={(event) => setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }))}
                required
                type="password"
                value={passwordDraft.currentPassword}
              />
              <label htmlFor="student-new-password">New password</label>
              <input
                autoComplete="new-password"
                id="student-new-password"
                minLength={8}
                pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
                title="Use at least 8 characters, including an uppercase letter and a special character."
                onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))}
                required
                type="password"
                value={passwordDraft.newPassword}
              />
              <label htmlFor="student-confirm-password">Confirm new password</label>
              <input
                autoComplete="new-password"
                id="student-confirm-password"
                minLength={8}
                onChange={(event) => setPasswordDraft((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
                type="password"
                value={passwordDraft.confirmPassword}
              />
              <button className="book-button" type="submit" disabled={passwordBusy}>{passwordBusy ? "Updating..." : "Update password"}</button>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
