import { useEffect, useState } from "react";
import { usersApi } from "../../api/users";
import { tasksApi } from "../../api/tasks";
import { useAdmin } from "../../hooks/useAdmin";
import type { TaskView } from "../../types/topics";
import { crumbText, kindLabel } from "../../lib/taskLabels";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const { email, loading: profileLoading, firstName: savedFirstName, surname: savedSurname, phoneNumber: savedPhoneNumber } = useAdmin();

  const [history, setHistory] = useState<TaskView[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Form State
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string, type: "error" | "success" } | null>(null);

  useEffect(() => {
    if (profileLoading) return;
    if (!email) {
      setStatus("error");
      return;
    }

    setFirstName(savedFirstName || "");
    setSurname(savedSurname || "");
    setPhoneNumber(savedPhoneNumber || "");

    tasksApi
      .getHistory()
      .then((myHistory) => {
        setHistory(myHistory);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [profileLoading, email, savedFirstName, savedSurname, savedPhoneNumber]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      await usersApi.updateProfile({
        first_name: firstName.trim() || null,
        surname: surname.trim() || null,
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
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Surname</label>
                <input 
                  type="text" 
                  value={surname} 
                  onChange={(e) => setSurname(e.target.value)}
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