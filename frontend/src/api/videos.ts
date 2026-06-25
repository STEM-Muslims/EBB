const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "admin_token";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface VideoUploadParams {
  file: File;
  title: string;
  description: string;
  privacy_status: "unlisted" | "public" | "private";
}

export interface StepResult {
  success: boolean;
  error: string | null;
}

export interface VideoUploadResponse {
  success: boolean;
  message: string;
  steps: {
    s3: StepResult;
    youtube: StepResult;
    database: StepResult;
  };
  video: {
    id: number;
    title: string;
    s3_url: string | null;
    youtube_url: string | null;
    status: string;
    error: string | null;
  } | null;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  privacy_status: string;
  s3_key: string | null;
  s3_url: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  uploaded_by: string | null;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoDeleteResponse {
  success: boolean;
  message: string;
  steps: {
    s3: StepResult;
    youtube: StepResult;
    database: StepResult;
  };
}

export const videosApi = {
  upload: async (params: VideoUploadParams): Promise<VideoUploadResponse> => {
    const body = new FormData();
    body.append("file", params.file);
    body.append("title", params.title);
    body.append("description", params.description);
    body.append("privacy_status", params.privacy_status);

    const res = await fetch(`${BASE_URL}/videos/upload`, {
      method: "POST",
      headers: authHeader(), // no Content-Type — the browser sets the multipart boundary
      body,
    });

    if (!res.ok) {
      let message = "Upload failed";
      try {
        const json = await res.json();
        message = json.detail ?? message;
      } catch {}
      throw new Error(message);
    }

    return res.json();
  },

  list: async (): Promise<Video[]> => {
    const res = await fetch(`${BASE_URL}/videos`, { headers: authHeader() });
    if (!res.ok) {
      let message = "Failed to load videos";
      try {
        const json = await res.json();
        message = json.detail ?? message;
      } catch {}
      throw new Error(message);
    }
    return res.json();
  },

  remove: async (id: number): Promise<VideoDeleteResponse> => {
    const res = await fetch(`${BASE_URL}/videos/${id}`, {
      method: "DELETE",
      headers: authHeader(),
    });
    if (!res.ok) {
      let message = "Failed to remove video";
      try {
        const json = await res.json();
        message = json.detail ?? message;
      } catch {}
      throw new Error(message);
    }
    return res.json();
  },
};
