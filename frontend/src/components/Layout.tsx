import { NavLink } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import styles from "./Layout.module.css";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
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
  const { email, logout } = useAdmin();

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
          {navItems.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.account}>
          {email && (
            <>
              <span className={styles.avatar}>
                {email.charAt(0).toUpperCase()}
              </span>
              <span className={styles.accountEmail}>{email}</span>
            </>
          )}
          <button className={styles.signOut} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
