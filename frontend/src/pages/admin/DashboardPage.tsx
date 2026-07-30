import { useEffect, useState } from "react";
import { useAdmin } from "../../hooks/useAdmin";
import { usersApi, type AdminUser, type RoleType } from "../../api/users";
import { useUserLookups } from "../../hooks/useUserLookups";
import { UserAttributesList } from "../../components/UserAttributesList";
import { UserFilters } from "../../components/UserFilters";
import { topicsApi } from "../../api/topics";
import { languagesApi, type Language } from "../../api/languages";
import type { Topic } from "../../types/topics";
import styles from "./DashboardPage.module.css";

const ROLE_OPTIONS: { value: RoleType; label: string }[] = [
  { value: "TEACHER", label: "Teacher" },
  { value: "TRANSLATOR", label: "Translator" },
];

/* ── Reusable Modal Wrapper ──────────────── */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.btnClose} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

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
        <div className="spinner"></div>
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
    <div className={styles.formInner}>
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
          Save Changes
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
    <div className={styles.formInner}>
      <p className={styles.muted}>Resetting password for <strong>{user.email}</strong></p>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>New Password</label>
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
        <div>
          <button
            className={styles.btnGhost}
            onClick={() => setShowPasswordForm(true)}
          >
            Change password
          </button>
        </div>
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
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { subjectsMap, languagesMap, isLoading: lookupsLoading } = useUserLookups();

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

  // Returns true if the user matches ALL selected subjects (if any) and ALL selected languages (if any)
  const filteredUsers = users.filter((u) => {
    const matchesSubjects =
      selectedSubjects.length === 0 ||
      selectedSubjects.every((id) => (u.teaching_subject_ids || []).includes(id));

    const matchesLanguages =
      selectedLanguages.length === 0 ||
      selectedLanguages.every((id) => (u.language_ids || []).includes(id));
    // Substring, case-insensitive. When a `name` field is added later,
    // TODO extend this to also check u.name.toLowerCase().includes(query). when name field is added
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === "" || u.email.toLowerCase().includes(query);

    return matchesSubjects && matchesLanguages && matchesSearch;
  });

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Users</h2>
        <button
          className={styles.btnPrimary}
          onClick={() => setShowForm(true)}
        >
          + Add user
        </button>
      </div>

      {!loading && (
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search users by email"
        />
      )}

      {!loading && (
        <UserFilters
          subjects={subjects}
          languages={languages}
          selectedSubjects={selectedSubjects}
          selectedLanguages={selectedLanguages}
          onSubjectsChange={setSelectedSubjects}
          onLanguagesChange={setSelectedLanguages}
          onClear={() => {
            setSelectedSubjects([]);
            setSelectedLanguages([]);
          }}
        />
      )}

      {loading ? (
        <div className="loadingState">
          <div className="spinner spinner--sm"></div>
          <span>Loading…</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
          <p>No users match your search or filters.</p>
          {(selectedSubjects.length > 0 || selectedLanguages.length > 0 || searchQuery.trim() !== "") && (
            <button
              className={styles.btnGhost}
              onClick={() => {
                setSelectedSubjects([]);
                setSelectedLanguages([]);
                setSearchQuery("");
              }}
              style={{ marginTop: "0.5rem" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Teaching Subjects</th>
              <th>Spoken Languages</th>
              <th>Auth</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td className={styles.emailCell}>{u.email}</td>
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
                <td>
                  {lookupsLoading ? (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading...</span>
                  ) : (
                    <UserAttributesList
                      ids={u.teaching_subject_ids}
                      type="subject"
                      lookupMap={subjectsMap}
                      maxItems={2}
                    />
                  )}
                </td>
                <td>
                  {lookupsLoading ? (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading...</span>
                  ) : (
                    <UserAttributesList
                      ids={u.language_ids}
                      type="language"
                      lookupMap={languagesMap}
                      maxItems={2}
                    />
                  )}
                </td>
                <td className={styles.muted}>
                  {u.google_id ? "Google" : "Password"}
                </td>
                <td>
                  <div className={styles.actionButtons}>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Modals ── */}
      {showForm && (
        <Modal title="Add New User" onClose={() => setShowForm(false)}>
          <CreateUserForm
            subjects={subjects}
            languages={languages}
            onCreated={() => {
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
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
        </Modal>
      )}

      {passwordUser && (
        <Modal title="Reset Password" onClose={() => setPasswordUser(null)}>
          <ResetPasswordForm
            user={passwordUser}
            onSaved={() => {
              setPasswordUser(null);
            }}
            onCancel={() => setPasswordUser(null)}
          />
        </Modal>
      )}
    </section>
  );
}

/* ── Create user form ────────────────────── */
function CreateUserForm({
  subjects,
  languages,
  onCreated,
  onCancel,
}: {
  subjects: Topic[];
  languages: Language[];
  onCreated: () => void;
  onCancel: () => void;
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
    <div className={styles.formInner}>
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
            placeholder="Leave blank for Google"
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
        <button className={styles.btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
