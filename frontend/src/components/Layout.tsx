import { NavLink, useLocation } from "react-router-dom";
import styles from "./Layout.module.css";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "⌂", exact: true },
  { to: "/topic_manage", label: "Topics", icon: "◈" },
  { to: "/upload", label: "Upload", icon: "↑" },
  { to: "/videos", label: "Videos", icon: "▦" },
  { to: "/about", label: "About", icon: "○" },
  { to: "/admin/dashboard", label: "Admin", icon: "◆" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>◆</span>
          <span className={styles.logoText}>Studybase</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, icon, exact }) => (
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

        <div className={styles.sidebarFooter}>
          <span className={styles.footerText}>{location.pathname}</span>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
