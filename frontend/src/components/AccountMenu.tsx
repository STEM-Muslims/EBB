import { useEffect, useRef, useState } from "react";
import { avatarApi, type RoleType } from "../api/users";
import { topicsApi } from "../api/topics";
import { languagesApi } from "../api/languages";
import { downscaleToSquare } from "../lib/image";
import { fullName, initials } from "../lib/userName";
import styles from "./AccountMenu.module.css";

/** One role and the specific things the user holds under it. */
function RoleLine({
  label,
  ids,
  names,
  loaded,
  noun,
}: {
  label: string;
  ids: number[];
  names: string[];
  loaded: boolean;
  noun: string;
}) {
  const plural = ids.length === 1 ? noun : `${noun}s`;
  return (
    <div className={styles.roleRow}>
      <span className={styles.roleChip}>{label}</span>
      {ids.length === 0 ? (
        <span className={styles.roleEmpty}>none assigned</span>
      ) : loaded && names.length > 0 ? (
        <span className={styles.roleTags}>
          {names.map((n) => (
            <span key={n} className={styles.roleTag}>
              {n}
            </span>
          ))}
        </span>
      ) : (
        <span className={styles.roleEmpty}>
          {ids.length} {plural}
        </span>
      )}
    </div>
  );
}

/**
 * Compact account control for the top bar: an avatar button that opens a
 * dropdown on click (profile summary, profile-photo controls, sign out).
 * The signed-in identity is intentionally not shown inline — only inside
 * the menu — to keep the header restrained.
 */
export default function AccountMenu({
  email,
  firstName,
  lastName,
  roles,
  teachingSubjectIds,
  languageIds,
  isAdmin,
  avatarUrl,
  onLogout,
}: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: RoleType[];
  teachingSubjectIds: number[];
  languageIds: number[];
  isAdmin: boolean;
  avatarUrl: string | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[] | null>(
    null,
  );
  const [languages, setLanguages] = useState<
    { id: number; name: string }[] | null
  >(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const identity = { email, first_name: firstName, last_name: lastName };
  const name = fullName(identity);
  const isTeacher = roles.includes("TEACHER");
  const isTranslator = roles.includes("TRANSLATOR");

  // Keep in sync once /auth/me resolves (avatarUrl arrives asynchronously).
  useEffect(() => setAvatar(avatarUrl), [avatarUrl]);

  // Resolve subject/language ids to names lazily, the first time the menu opens.
  useEffect(() => {
    if (!open) return;
    if (isTeacher && subjects === null && teachingSubjectIds.length > 0) {
      topicsApi
        .getSubjects()
        .then((s) => setSubjects(s.map((t) => ({ id: t.id, name: t.name }))))
        .catch(() => setSubjects([]));
    }
    if (isTranslator && languages === null && languageIds.length > 0) {
      languagesApi
        .getAll()
        .then((l) => setLanguages(l.map((x) => ({ id: x.id, name: x.name }))))
        .catch(() => setLanguages([]));
    }
  }, [open, isTeacher, isTranslator]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const blob = await downscaleToSquare(file);
      const { avatar_url } = await avatarApi.upload(blob);
      setAvatar(avatar_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t set photo.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setError("");
    setBusy(true);
    try {
      await avatarApi.remove();
      setAvatar(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t remove photo.");
    } finally {
      setBusy(false);
    }
  }

  const subjectNames = (subjects ?? [])
    .filter((s) => teachingSubjectIds.includes(s.id))
    .map((s) => s.name);
  const languageNames = (languages ?? [])
    .filter((l) => languageIds.includes(l.id))
    .map((l) => l.name);

  const avatarInner = avatar ? (
    <img src={avatar} alt="" className={styles.avatarImg} />
  ) : (
    <span className={styles.avatarInitial}>{initials(identity)}</span>
  );

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className={styles.avatar}>{avatarInner}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.profile}>
            <span className={styles.profileAvatar}>{avatarInner}</span>
            <div className={styles.profileText}>
              {name && (
                <span className={styles.profileName} title={name}>
                  {name}
                </span>
              )}
              <span
                className={`${styles.profileEmail} ${name ? styles.profileEmailSub : ""}`}
                title={email}
              >
                {email}
              </span>
              <div className={styles.roleList}>
                {isAdmin && (
                  <div className={styles.roleRow}>
                    <span className={styles.roleChip}>Administrator</span>
                  </div>
                )}
                {isTeacher && (
                  <RoleLine
                    label="Teacher"
                    ids={teachingSubjectIds}
                    names={subjectNames}
                    loaded={subjects !== null}
                    noun="subject"
                  />
                )}
                {isTranslator && (
                  <RoleLine
                    label="Translator"
                    ids={languageIds}
                    names={languageNames}
                    loaded={languages !== null}
                    noun="language"
                  />
                )}
                {!isAdmin && !isTeacher && !isTranslator && (
                  <div className={styles.roleRow}>
                    <span className={styles.roleChip}>Member</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.section}>
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <span className={styles.itemIcon} aria-hidden="true">
                ⬡
              </span>
              {busy ? "Saving…" : avatar ? "Change photo" : "Add a photo"}
            </button>
            {avatar && (
              <button
                type="button"
                className={styles.item}
                role="menuitem"
                onClick={onRemove}
                disabled={busy}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  ⌫
                </span>
                Remove photo
              </button>
            )}
          </div>

          <div className={styles.divider} />

          <button
            type="button"
            className={`${styles.item} ${styles.itemDanger}`}
            role="menuitem"
            onClick={onLogout}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              ↪
            </span>
            Sign out
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={onPick}
          />
        </div>
      )}
    </div>
  );
}
