const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "admin_token";

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: authHeaders(),
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface AdminUser {
  id: number;
  email: string;
  is_admin: boolean;
  google_id: string | null;
  hashed_password: string | null;
}

export const usersApi = {
  getAll: () => request<AdminUser[]>("/users"),

  create: (data: { email: string; password?: string; is_admin: boolean }) =>
    request<AdminUser>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  changePassword: (password: string) =>
    request<{ ok: boolean }>("/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({ password }),
    }),
};
