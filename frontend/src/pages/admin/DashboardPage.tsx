import { useEffect, useState } from "react";
import { useAdmin } from "../../hooks/useAdmin";
import { usersApi, type AdminUser, type RoleType } from "../../api/users";
import { topicsApi } from "../../api/topics";
import { languagesApi, type Language } from "../../api/languages";
import type { Topic } from "../../types/topics";
import styles from "./DashboardPage.module.css";

const ROLE_OPTIONS: { value: RoleType; label: string }[] = [
  { value: "TEACHER", label: "Teacher" },
  { value: "TRANSLATOR", label: "Translator" },
];

function RoleCheckboxes({
  selected,
  onChange,
}: {
  selected: RoleType[];
  onChange: (roles: RoleType[]) => void;
}) {
  function toggle(role: RoleType) {
    onChange(
      selected.includes(role)
        ? selected.filter((r) => r !== role)
        : [...selected, role],
    );
  }

  return (
    <div className={styles.field}>
      <label className={styles.label}>Roles</label>
      <div className={styles.checkboxGroup}>
        {ROLE_OPTIONS.map((opt) => (
          <label key={opt.value} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.multiSelect}>
        {options.length === 0 ? (
          <span className={styles.muted}>None available</span>
        ) : (
          options.map((o) => (
            <label key={o.id} className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
              />
              <span>{o.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

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
  subjects,
  languages,
  onSaved,
  onCancel,
}: {
  user: AdminUser;
  subjects: Topic[];
  languages: Language[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [roles, setRoles] = useState<RoleType[]>(user.roles ?? []);
  const [teachingSubjectIds, setTeachingSubjectIds] = useState<number[]>(
    user.teaching_subject_ids ?? [],
  );
  const [languageIds, setLanguageIds] = useState<number[]>(
    user.language_ids ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setLoading(true);
    setError("");

    try {
      await usersApi.update(user.id, {
        email,
        is_admin: isAdmin,
        roles,
        teaching_subject_ids: roles.includes("TEACHER") ? teachingSubjectIds : [],
        language_ids: roles.includes("TRANSLATOR") ? languageIds : [],
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

      <RoleCheckboxes selected={roles} onChange={setRoles} />

      {roles.includes("TEACHER") && (
        <MultiSelect
          label="Subjects they can teach"
          options={subjects}
          selected={teachingSubjectIds}
          onChange={setTeachingSubjectIds}
        />
      )}

      {roles.includes("TRANSLATOR") && (
        <MultiSelect
          label="Languages they can translate into"
          options={languages}
          selected={languageIds}
          onChange={setLanguageIds}
        />
      )}

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
  const [subjects, setSubjects] = useState<Topic[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
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
    topicsApi
      .getSubjects()
      .then(setSubjects)
      .catch(() => console.error("Failed to load subjects"));
    languagesApi
      .getAll()
      .then(setLanguages)
      .catch(() => console.error("Failed to load languages"));
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
          subjects={subjects}
          languages={languages}
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
                  <div className={styles.roleCell}>
                    {u.is_admin && (
                      <span className={`${styles.badge} ${styles.badgeAdmin}`}>
                        Admin
                      </span>
                    )}
                    {u.roles?.map((r) => (
                      <span
                        key={r}
                        className={`${styles.badge} ${styles.badgeRole}`}
                      >
                        {r === "TEACHER" ? "Teacher" : "Translator"}
                      </span>
                    ))}
                    {!u.is_admin && (u.roles?.length ?? 0) === 0 && (
                      <span className={`${styles.badge} ${styles.badgeUser}`}>
                        User
                      </span>
                    )}
                  </div>
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
              subjects={subjects}
              languages={languages}
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
function CreateUserForm({
  subjects,
  languages,
  onCreated,
}: {
  subjects: Topic[];
  languages: Language[];
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [teachingSubjectIds, setTeachingSubjectIds] = useState<number[]>([]);
  const [languageIds, setLanguageIds] = useState<number[]>([]);
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
        roles,
        teaching_subject_ids: roles.includes("TEACHER") ? teachingSubjectIds : [],
        language_ids: roles.includes("TRANSLATOR") ? languageIds : [],
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

      <RoleCheckboxes selected={roles} onChange={setRoles} />

      {roles.includes("TEACHER") && (
        <MultiSelect
          label="Subjects they can teach"
          options={subjects}
          selected={teachingSubjectIds}
          onChange={setTeachingSubjectIds}
        />
      )}

      {roles.includes("TRANSLATOR") && (
        <MultiSelect
          label="Languages they can translate into"
          options={languages}
          selected={languageIds}
          onChange={setLanguageIds}
        />
      )}

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
