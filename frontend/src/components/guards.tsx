import { Navigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";

function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        gap: "0.75rem",
      }}
    >
      <div className="spinner"></div>
      Loading…
    </div>
  );
}

/** Signed-in admins only. Non-admins go to their UI; guests go to login. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { email, isAdmin, loading } = useAdmin();
  if (loading) return <Loading />;
  if (!email) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Signed-in non-admins only. Admins go to the admin UI; guests go to login. */
export function RequireUser({ children }: { children: React.ReactNode }) {
  const { email, isAdmin, loading } = useAdmin();
  if (loading) return <Loading />;
  if (!email) return <Navigate to="/admin/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
