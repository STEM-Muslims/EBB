import { API_URL as BASE_URL } from "../config";
import type { TaskType, TaskView } from "../types/topics";

const TOKEN_KEY = "admin_token";

function authHeaders(): Record<string, string> {
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
      message = (await res.json()).detail ?? message;
    } catch {
      /* empty */
    }
    throw new Error(message);
  }
  return res.json();
}

async function multipart<T>(url: string, body: FormData): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  if (!res.ok) {
    let message = "Upload failed";
    try {
      message = (await res.json()).detail ?? message;
    } catch {
      /* empty */
    }
    throw new Error(message);
  }
  return res.json();
}

export const tasksApi = {
  post: (data: { topic_id: number; task_type: TaskType; language_id?: number }) =>
    request<TaskView>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getQueue: () => request<TaskView[]>("/tasks/queue"),

  getFullQueue: () => request<TaskView[]>("/tasks/queue/all"),

  getInProgress: () => request<TaskView[]>("/tasks/in-progress"),

  getMine: () => request<TaskView[]>("/tasks/mine"),

  getReleased: () => request<TaskView[]>("/tasks/released"),

  claim: (id: number) =>
    request<TaskView>(`/tasks/${id}/claim`, { method: "POST" }),

  release: (id: number) =>
    request<TaskView>(`/tasks/${id}/release`, { method: "POST" }),

  requeue: (id: number) =>
    request<TaskView>(`/tasks/${id}/requeue`, { method: "POST" }),

  delete: (id: number) =>
      request<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),

  reorderQueue: (task_ids: number[]) =>
    request<{ ok: boolean }>("/tasks/queue/reorder", {
      method: "PATCH",
      body: JSON.stringify({ task_ids }),
    }),

  getAdminAll: () => request<TaskView[]>("/tasks/admin/all"),

  getEligibleUsers: (id: number) =>
    request<{ id: number; email: string; avatar_url: string | null }[]>(
      `/tasks/${id}/eligible-users`,
    ),

  adminUpdate: (
    id: number,
    data: { status: string; assignee_email?: string | null },
  ) =>
    request<TaskView>(`/tasks/${id}/admin`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  uploadCaption: (taskId: number, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return multipart<TaskView>(`/tasks/${taskId}/caption`, body);
  },
};
