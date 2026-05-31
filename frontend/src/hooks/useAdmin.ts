import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "admin_token";

export function storeAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function useAdmin() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { email: string }) => setEmail(data.email))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        navigate("/admin/login", { replace: true });
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    navigate("/admin/login", { replace: true });
  }

  return { email, loading, logout };
}
