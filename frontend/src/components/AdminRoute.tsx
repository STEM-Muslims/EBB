import { useAdmin } from "../hooks/useAdmin";
import { Navigate } from "react-router-dom";

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, loading } = useAdmin();

  if (loading) return null; 
  if (!email) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
