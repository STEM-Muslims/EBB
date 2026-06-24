import { API_URL as BASE_URL } from "../config";

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
  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.detail ?? message;
    } catch {
      /* empty */
    }
    throw new Error(message);
  }
  return res.json();
}

export interface Language {
  id: number;
  name: string;
  code: string | null;
  is_active: boolean;
}

export const languagesApi = {
  getAll: () => request<Language[]>("/languages"),

  create: (data: { name: string; code?: string }) =>
    request<Language>("/languages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: { name?: string; code?: string; is_active?: boolean },
  ) =>
    request<Language>(`/languages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  remove: (id: number) =>
    request<{ ok: boolean }>(`/languages/${id}`, {
      method: "DELETE",
    }),
};
