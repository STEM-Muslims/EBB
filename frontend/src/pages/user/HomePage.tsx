import { Link } from "react-router-dom";
import { useAdmin } from "../../hooks/useAdmin";
import styles from "./user.module.css";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Teacher",
  TRANSLATOR: "Translator",
};

const SHORTCUTS = [
  {
    to: "/tasks",
    icon: "↑",
    title: "My tasks",
    desc: "Upload videos or captions for topics assigned to you.",
  },
  {
    to: "/videos",
    icon: "▦",
    title: "Videos uploaded",
    desc: "Browse the lessons that have been recorded.",
  },
  {
    to: "/topics",
    icon: "◈",
    title: "Subjects & topics",
    desc: "Explore the curriculum by subject, module, chapter and topic.",
  },
];

export default function UserHomePage() {
  const { email, roles } = useAdmin();

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Overview</span>
          <h1>Welcome back</h1>
          <p className="pageSub">{email}</p>
        </div>
        <div className="pageActions">
          {roles.length > 0 ? (
            roles.map((r) => (
              <span key={r} className="pill">
                {ROLE_LABEL[r] ?? r}
              </span>
            ))
          ) : (
            <span className="pill pill--stone">Member</span>
          )}
        </div>
      </div>

      <h2 className={styles.sectionLabel}>Quick actions</h2>
      <div className={styles.shortcutGrid}>
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className={`card card--hover ${styles.shortcut}`}>
            <span className={`iconChip iconChip--sm ${styles.shortcutIcon}`}>
              {s.icon}
            </span>
            <div className={styles.shortcutBody}>
              <h3 className={styles.shortcutTitle}>{s.title}</h3>
              <p className={styles.shortcutDesc}>{s.desc}</p>
            </div>
            <span className={styles.shortcutArrow} aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
