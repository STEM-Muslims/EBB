import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import type { RoleType } from "../api/users";

const TOKEN_KEY = "admin_token";

interface MeResponse {
  email: string;
  is_admin: boolean;
  roles: RoleType[];
}

export function storeAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function useAdmin() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<RoleType[]>([]);
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
      .then((data: MeResponse) => {
        setEmail(data.email);
        setIsAdmin(Boolean(data.is_admin));
        setRoles(data.roles ?? []);
      })
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

  return { email, isAdmin, roles, loading, logout };
}
