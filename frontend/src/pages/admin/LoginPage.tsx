import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authApi } from "../../api/users";
import { API_URL } from "../../config";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    try {
      const res = await authApi.login({ email, password });
      localStorage.setItem("admin_token", res.access_token);
      window.location.href = "/";
    } catch (err: any) {
      setLocalError(err.message || "Invalid email or password");
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <img
            className={styles.logoImg}
            src="/logo.png"
            alt="Education Beyond Borders"
          />
          <h1 className={styles.title}>Sign in</h1>
        </div>

        {(urlError === "AccessDenied" || localError) && (
          <p className={styles.error}>
            {localError ||
              "Your account is not authorised. Contact the project lead to request access."}
          </p>
        )}

        <form onSubmit={handlePasswordLogin} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@example.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn--block">
            Sign In
          </button>
        </form>

        <div className={styles.divider}>or continue with</div>

        <a href={`${API_URL}/auth/google`} className={styles.google}>
          <GoogleIcon />
          Sign in with Google
        </a>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.6 39.5 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"
      />
    </svg>
  );
}
