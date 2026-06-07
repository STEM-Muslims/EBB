import styles from "./HomePage.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Welcome</h1>
      <p className={styles.sub}>
        Select a section from the sidebar to get started.
      </p>
    </div>
  );
}
