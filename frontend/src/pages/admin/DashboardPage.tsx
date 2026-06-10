import { useEffect, useState } from "react";
import { useAdmin } from "../../hooks/useAdmin";
import { usersApi, type AdminUser } from "../../api/users";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { email, loading, logout } = useAdmin();

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Admin</h1>
          <p className={styles.sub}>Education Beyond Borders</p>
        </div>
      </div>

      <div className={styles.sections}>
        <AccountSection email={email!} onLogout={logout} />
        <UsersSection />
      </div>
    </div>
  );
}

function EditUserForm({
  user,
  onSaved,
  onCancel,
}: {
  user: AdminUser;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setLoading(true);
    setError("");

    try {
      await usersApi.update(user.id, {
        email,
        is_admin: isAdmin,
      });

      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.createForm}>
      <h3>Edit User</h3>

      <div className={styles.field}>
        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
        />
        <span>Admin</span>
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formActions}>
        <button className={styles.btnPrimary} onClick={save} disabled={loading}>
          Save
        </button>

        <button className={styles.btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ResetPasswordForm({
  user,
  onSaved,
  onCancel,
}: {
  user: AdminUser;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await usersApi.resetPassword(user.id, password);
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.createForm}>
      <h3>Reset Password</h3>

      <p>{user.email}</p>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Confirm</label>
          <input
            className={styles.input}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formActions}>
        <button className={styles.btnPrimary} onClick={save} disabled={loading}>
          Reset Password
        </button>

        <button className={styles.btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Account section ─────────────────────── */
function AccountSection({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => void;
}) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function changePassword() {
    if (!password || password !== confirm) {
      setStatus("error");
      return;
    }
    setSaving(true);
    setStatus("idle");
    try {
      await usersApi.changePassword(password);
      setStatus("ok");
      setPassword("");
      setConfirm("");
      setShowPasswordForm(false);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Account</h2>

      <div className={styles.accountRow}>
        <div className={styles.avatar}>{email.charAt(0).toUpperCase()}</div>
        <div className={styles.accountInfo}>
          <span className={styles.accountEmail}>{email}</span>
          <span className={styles.accountRole}>Administrator</span>
        </div>
        <button className={styles.btnDanger} onClick={onLogout}>
          Sign out
        </button>
      </div>

      <div className={styles.divider} />

      {!showPasswordForm ? (
        <button
          className={styles.btnGhost}
          onClick={() => setShowPasswordForm(true)}
        >
          Change password
        </button>
      ) : (
        <div className={styles.passwordForm}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>New password</label>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirm</label>
              <input
                className={styles.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
          </div>
          {status === "error" && (
            <p className={styles.error}>
              {password !== confirm
                ? "Passwords do not match."
                : "Failed to update. Try again."}
            </p>
          )}
          {status === "ok" && (
            <p className={styles.success}>Password updated.</p>
          )}
          <div className={styles.formActions}>
            <button
              className={styles.btnPrimary}
              onClick={changePassword}
              disabled={saving}
            >
              {saving ? "Saving…" : "Update password"}
            </button>
            <button
              className={styles.btnGhost}
              onClick={() => {
                setShowPasswordForm(false);
                setPassword("");
                setConfirm("");
                setStatus("idle");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Users section ───────────────────────── */
function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch {
      console.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Users</h2>
        <button
          className={styles.btnPrimary}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ Add user"}
        </button>
      </div>

      {showForm && (
        <CreateUserForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Auth</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <span
                    className={`${styles.badge} ${u.is_admin ? styles.badgeAdmin : styles.badgeUser}`}
                  >
                    {u.is_admin ? "Admin" : "User"}
                  </span>
                </td>
                <td className={styles.muted}>
                  {u.google_id ? "Google" : "Password"}
                </td>
                <td>
                  <button
                    className={styles.btnGhost}
                    onClick={() => setEditingUser(u)}
                  >
                    Edit
                  </button>

                  <button
                    className={styles.btnGhost}
                    onClick={() => setPasswordUser(u)}
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {editingUser && (
            <EditUserForm
              user={editingUser}
              onSaved={() => {
                setEditingUser(null);
                load();
              }}
              onCancel={() => setEditingUser(null)}
            />
          )}

          {passwordUser && (
            <ResetPasswordForm
              user={passwordUser}
              onSaved={() => {
                setPasswordUser(null);
              }}
              onCancel={() => setPasswordUser(null)}
            />
          )}
        </table>
      )}
    </section>
  );
}

/* ── Create user form ────────────────────── */
function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await usersApi.create({
        email: email.trim(),
        password: password || undefined,
        is_admin: isAdmin,
      });
      onCreated();
    } catch (e: any) {
      setError(e.message ?? "Failed to create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.createForm}>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="user@example.com"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Password (optional)</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank for Google-only"
          />
        </div>
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
        />
        <span>Grant admin access</span>
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formActions}>
        <button
          className={styles.btnPrimary}
          onClick={create}
          disabled={loading}
        >
          {loading ? "Creating…" : "Create user"}
        </button>
      </div>
    </div>
  );
}
