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

export type RoleType = "TEACHER" | "TRANSLATOR";

export interface AdminUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  google_id: string | null;
  has_password: boolean;
  avatar_url: string | null;
  phone_number: string | null;
  roles: RoleType[];
  teaching_subject_ids: number[];
  language_ids: number[];
}

export interface UserProfileInput {
  roles: RoleType[];
  teaching_subject_ids: number[];
  language_ids: number[];
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
}

export const usersApi = {
  getAll: () => request<AdminUser[]>("/users"),

  create: (
    data: { email: string; password?: string; is_admin: boolean } & UserProfileInput,
  ) =>
    request<AdminUser>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProfile: (data: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  }) => request<AdminUser>("/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  }),

  changePassword: (data: { current_password?: string; new_password: string }) =>
    request<{ ok: boolean }>("/users/me/password", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  changeEmail: (data: { current_password: string; new_email: string }) =>
    request<{ email: string; access_token: string; token_type: string }>(
      "/users/me/email",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  update: (
    id: number,
    data: { email: string; is_admin: boolean } & UserProfileInput,
  ) =>
    request(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  resetPassword: (id: number, password: string) =>
    request(`/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    }),
};

export const authApi = {
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

/** Multipart request that lets the browser set its own Content-Type boundary. */
async function multipartRequest<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = "Request failed";
    try {
      message = (await res.json()).detail ?? message;
    } catch {
      /* empty */
    }
    throw new Error(message);
  }
  return res.json();
}

export const avatarApi = {
  upload: (blob: Blob) => {
    const form = new FormData();
    form.append("file", blob, "avatar.jpg");
    return multipartRequest<{ avatar_url: string }>("/users/me/avatar", {
      method: "POST",
      body: form,
    });
  },
  remove: () =>
    multipartRequest<{ avatar_url: string | null }>("/users/me/avatar", {
      method: "DELETE",
    }),
};
