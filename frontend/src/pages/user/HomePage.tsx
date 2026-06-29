import { Link } from "react-router-dom";
import { useAdmin } from "../../hooks/useAdmin";
import styles from "./user.module.css";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Teacher",
  TRANSLATOR: "Translator",
};

const SHORTCUTS = [
  {
    to: "/upload",
    icon: "↑",
    title: "Upload a video",
    desc: "Publish a new lesson to the library.",
  },
  {
    to: "/videos",
    icon: "▦",
    title: "Video lessons",
    desc: "Browse the published lesson library.",
  },
  {
    to: "/topics",
    icon: "◈",
    title: "Subjects & topics",
    desc: "Explore the curriculum by subject and topic.",
  },
];

export default function UserHomePage() {
  const { email, roles } = useAdmin();

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <h1>Welcome back</h1>
        <p className="pageSub">{email}</p>
      </div>

      <div className={styles.roleRow}>
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

      <div className="cardGrid" style={{ marginTop: "2rem" }}>
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className="card card--hover">
            <span
              className="iconChip iconChip--sm"
              style={{ marginBottom: "1rem" }}
            >
              {s.icon}
            </span>
            <h3 style={{ color: "var(--brand-darker)", marginBottom: "0.35rem" }}>
              {s.title}
            </h3>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
