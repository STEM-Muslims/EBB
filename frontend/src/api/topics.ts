import { API_URL as BASE_URL } from "../config";
import type {
  ArchivedTopic,
  CompletedTopic,
  Topic,
  TopicDetail,
  UploadResponse,
} from "../types/topics";

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

/** Multipart upload that lets the browser set the multipart boundary. */
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

export const topicsApi = {
  getTree: () => request<Topic[]>("/topics/tree"),

  getSubjects: () => request<Topic[]>("/topics/subjects"),

  getDetail: (id: number) => request<TopicDetail>(`/topics/${id}/detail`),

  getCompleted: () => request<CompletedTopic[]>("/topics/completed"),

  getArchived: () => request<ArchivedTopic[]>("/topics/archived"),

  restore: (id: number) =>
    request<Topic>(`/topics/${id}/restore`, { method: "POST" }),

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

  reorder: (parent_id: number | null, topic_ids: number[]) =>
    request<{ ok: boolean }>("/topics/reorder", {
      method: "PATCH",
      body: JSON.stringify({ parent_id, topic_ids }),
    }),

  uploadVideo: (
    topicId: number,
    params: {
      file: File;
      title?: string;
      description?: string;
      privacy_status?: "unlisted" | "public" | "private";
    },
  ) => {
    const body = new FormData();
    body.append("file", params.file);
    body.append("title", params.title ?? "");
    body.append("description", params.description ?? "");
    body.append("privacy_status", params.privacy_status ?? "unlisted");
    return multipart<UploadResponse>(`/topics/${topicId}/upload`, body);
  },

  removeVideo: (topicId: number) =>
    request<{ success: boolean; message: string }>(`/topics/${topicId}/video`, {
      method: "DELETE",
    }),

  updateYoutubePrivacy: (
    topicId: number,
    privacy_status: "public" | "unlisted" | "private",
  ) =>
    request<Topic>(`/topics/${topicId}/youtube-privacy`, {
      method: "PATCH",
      body: JSON.stringify({ privacy_status }),
    }),
};
