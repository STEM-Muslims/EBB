import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import AccountMenu from "./AccountMenu";
import styles from "./Layout.module.css";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
  /** When present, the item is a dropdown of sub-links instead of a single link. */
  children?: { to: string; label: string }[];
}

/**
 * Shared application shell. The navigation panel sits across the top of the
 * page and is used by both the admin and non-admin UIs; they differ only in
 * `label` (a small section tag) and `navItems`.
 */
export default function Layout({
  label,
  navItems,
  children,
}: {
  label?: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const { email, isAdmin, roles, avatarUrl, logout } = useAdmin();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img
            className={styles.logoImg}
            src="/logo.png"
            alt="Education Beyond Borders"
          />
          {label && <span className={styles.brandLabel}>{label}</span>}
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) =>
            item.children ? (
              <NavDropdown key={item.to} item={item} />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>

        <div className={styles.account}>
          {email && (
            <AccountMenu
              email={email}
              roles={roles}
              isAdmin={isAdmin}
              avatarUrl={avatarUrl}
              onLogout={logout}
            />
          )}
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

/** A nav entry that opens a dropdown of sub-links on click. */
function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const active = (item.children ?? []).some(
    (c) => location.pathname === c.to || location.pathname.startsWith(`${c.to}/`),
  );

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div className={styles.navDropdown} ref={ref}>
      <button
        type="button"
        className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.navIcon}>{item.icon}</span>
        <span>{item.label}</span>
        <span className={styles.navCaret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.navMenu} role="menu">
          {(item.children ?? []).map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${styles.navMenuItem} ${isActive ? styles.navMenuItemActive : ""}`
              }
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
