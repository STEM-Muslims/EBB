import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { storeAdminToken } from "../../hooks/useAdmin";

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      storeAdminToken(token);
      navigate("/", { replace: true });
    } else {
      navigate("/admin/login?error=AccessDenied", { replace: true });
    }
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Signing in…</p>
    </main>
  );
}
