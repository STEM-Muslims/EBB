const BASE_URL = import.meta.env.VITE_API_URL;

import type { Topic } from "../types/topics";
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export const topicsApi = {
  getTree: () => request<Topic[]>("/topics/tree"),

  getById: (id: number) => request<Topic>(`/topics/${id}`),

  create: (data: Partial<Topic>) =>
    request<Topic>("/topics", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Topic>) =>
    request<Topic>(`/topics/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  archive: (id: number) =>
    request(`/topics/${id}`, {
      method: "DELETE",
    }),
};
