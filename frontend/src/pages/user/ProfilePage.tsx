import { useEffect, useState } from "react";
import { usersApi } from "../../api/users";
import { tasksApi } from "../../api/tasks";
import { useAdmin, storeAdminToken } from "../../hooks/useAdmin";
import type { TaskView } from "../../types/topics";
import { crumbText, kindLabel } from "../../lib/taskLabels";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const {
    email,
    loading: profileLoading,
    firstName: savedFirstName,
    lastName: savedLastName,
    phoneNumber: savedPhoneNumber,
    googleId,
    hasPassword,
  } = useAdmin();

  const [history, setHistory] = useState<TaskView[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string, type: "error" | "success" } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordHasPassword, setPasswordHasPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string, type: "error" | "success" } | null>(null);

  // Email form state
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string, type: "error" | "success" } | null>(null);

  useEffect(() => {
    if (profileLoading) return;
    if (!email) {
      setStatus("error");
      return;
    }

    setFirstName(savedFirstName || "");
    setLastName(savedLastName || "");
    setPhoneNumber(savedPhoneNumber || "");
    setPasswordHasPassword(hasPassword);
    setNewEmail(email);

    tasksApi
      .getHistory()
      .then((myHistory) => {
        setHistory(myHistory);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [profileLoading, email, savedFirstName, savedLastName, savedPhoneNumber, hasPassword]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      await usersApi.updateProfile({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone_number: phoneNumber.trim() || null,
      });
      setSaveMessage({ text: "Profile updated successfully.", type: "success" });
    } catch (err: unknown) {
      setSaveMessage({
        text: err instanceof Error ? err.message : "Failed to update profile.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordHasPassword && !currentPassword) {
      setPasswordMessage({ text: "Enter your current password.", type: "error" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ text: "New password must be at least 8 characters.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setPasswordSaving(true);
    try {
      await usersApi.changePassword({
        current_password: passwordHasPassword ? currentPassword : undefined,
        new_password: newPassword,
      });
      setPasswordMessage({
        text: passwordHasPassword ? "Password updated successfully." : "Password set successfully.",
        type: "success",
      });
      setPasswordHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordMessage({
        text: err instanceof Error ? err.message : "Failed to update password.",
        type: "error"
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);

    const trimmedEmail = newEmail.trim();
    if (!emailCurrentPassword) {
      setEmailMessage({ text: "Enter your current password.", type: "error" });
      return;
    }
    if (!trimmedEmail) {
      setEmailMessage({ text: "Enter a new email address.", type: "error" });
      return;
    }

    setEmailSaving(true);
    try {
      const res = await usersApi.changeEmail({
        current_password: emailCurrentPassword,
        new_email: trimmedEmail,
      });
      storeAdminToken(res.access_token);
      setEmailMessage({ text: "Email updated successfully. Reloading…", type: "success" });
      setEmailCurrentPassword("");
      setTimeout(() => window.location.reload(), 900);
    } catch (err: unknown) {
      setEmailMessage({
        text: err instanceof Error ? err.message : "Failed to update email.",
        type: "error"
      });
      setEmailSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="loadingState">
        <div className="spinner"></div>
        <span>Loading profile…</span>
      </div>
    );
  }

  if (status === "error") {
    return <p className="emptyState">Could not load your profile.</p>;
  }

  return (
    <div className="container section">
      <div className="pageHeadText" style={{ marginBottom: "2rem" }}>
        <h1>My Profile</h1>
        <p className="pageSub">Update your personal details and view your contribution history.</p>
      </div>

      <div className="stack" style={{ gap: "2rem" }}>
        {/* Profile Settings */}
        <section className="card card--pad-lg stack">
          <h2>Personal Details</h2>
          <form onSubmit={handleSave} className="stack" style={{ gap: "1.5rem", maxWidth: 500 }}>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>First Name</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.6rem",
                    fontSize: "0.95rem"
                  }}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.6rem",
                    fontSize: "0.95rem"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.6rem",
                  fontSize: "0.95rem"
                }}
              />
            </div>

            {saveMessage && (
              <div style={{ 
                padding: "0.75rem", 
                borderRadius: "var(--radius-md)", 
                background: saveMessage.type === "success" ? "#e8f5e9" : "#ffebee",
                color: saveMessage.type === "success" ? "#1b5e20" : "#c62828",
                fontSize: "0.9rem"
              }}>
                {saveMessage.text}
              </div>
            )}

            <div>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Security */}
        <section className="card card--pad-lg stack">
          <h2>Security</h2>

          <div className="stack" style={{ gap: "2rem" }}>
            {/* Password */}
            <form onSubmit={handlePasswordSave} className="stack" style={{ gap: "1.5rem", maxWidth: 500 }}>
              <h3 style={{ fontSize: "1rem" }}>{passwordHasPassword ? "Change Password" : "Set Password"}</h3>

              {passwordHasPassword && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.6rem",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.6rem",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.6rem",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>
              </div>

              {passwordMessage && (
                <div style={{
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: passwordMessage.type === "success" ? "#e8f5e9" : "#ffebee",
                  color: passwordMessage.type === "success" ? "#1b5e20" : "#c62828",
                  fontSize: "0.9rem"
                }}>
                  {passwordMessage.text}
                </div>
              )}

              <div>
                <button type="submit" className="btn" disabled={passwordSaving}>
                  {passwordSaving ? "Saving..." : passwordHasPassword ? "Update Password" : "Set Password"}
                </button>
              </div>
            </form>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Email */}
            <div className="stack" style={{ gap: "1.5rem", maxWidth: 500 }}>
              <h3 style={{ fontSize: "1rem" }}>Email Address</h3>

              {googleId ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Your email is managed by your Google account and can't be changed here.
                </p>
              ) : (
                <form onSubmit={handleEmailSave} className="stack" style={{ gap: "1.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Current Password</label>
                    <input
                      type="password"
                      value={emailCurrentPassword}
                      onChange={(e) => setEmailCurrentPassword(e.target.value)}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "0.6rem",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>New Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "0.6rem",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>

                  {emailMessage && (
                    <div style={{
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      background: emailMessage.type === "success" ? "#e8f5e9" : "#ffebee",
                      color: emailMessage.type === "success" ? "#1b5e20" : "#c62828",
                      fontSize: "0.9rem"
                    }}>
                      {emailMessage.text}
                    </div>
                  )}

                  <div>
                    <button type="submit" className="btn" disabled={emailSaving}>
                      {emailSaving ? "Saving..." : "Update Email"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* History */}
        <section className="stack">
          <h2>My Contributions ({history.length})</h2>
          {history.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              You haven't completed any tasks yet. Head over to the <Link to="/tasks/queue">Task Queue</Link> to get started!
            </div>
          ) : (
            <div className="stack" style={{ gap: "0.75rem" }}>
              {history.map(t => (
                <div key={t.id} className="card" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      {crumbText(t)}
                    </div>
                    <strong style={{ fontSize: "1rem" }}>{t.topic_name}</strong>
                    <div style={{ marginTop: "0.4rem" }}>
                      <span className="pill pill--stone">{kindLabel(t)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Completed on</div>
                    <div style={{ fontWeight: 600, color: "var(--brand)" }}>
                      {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "Unknown"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}