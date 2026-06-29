import { useEffect, useRef, useState } from "react";
import { avatarApi, type RoleType } from "../api/users";
import { downscaleToSquare } from "../lib/image";
import styles from "./AccountMenu.module.css";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Teacher",
  TRANSLATOR: "Translator",
};

function initials(email: string) {
  return email.charAt(0).toUpperCase();
}

/**
 * Compact account control for the top bar: an avatar button that opens a
 * dropdown on click (profile summary, profile-photo controls, sign out).
 * The signed-in identity is intentionally not shown inline — only inside
 * the menu — to keep the header restrained.
 */
export default function AccountMenu({
  email,
  roles,
  isAdmin,
  avatarUrl,
  onLogout,
}: {
  email: string;
  roles: RoleType[];
  isAdmin: boolean;
  avatarUrl: string | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep in sync once /auth/me resolves (avatarUrl arrives asynchronously).
  useEffect(() => setAvatar(avatarUrl), [avatarUrl]);

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

  const roleChips =
    roles.length > 0
      ? roles.map((r) => ROLE_LABEL[r] ?? r)
      : [isAdmin ? "Administrator" : "Member"];

  const avatarInner = avatar ? (
    <img src={avatar} alt="" className={styles.avatarImg} />
  ) : (
    <span className={styles.avatarInitial}>{initials(email)}</span>
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
              <span className={styles.profileEmail} title={email}>
                {email}
              </span>
              <div className={styles.profileRoles}>
                {roleChips.map((c) => (
                  <span key={c} className={styles.roleChip}>
                    {c}
                  </span>
                ))}
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
