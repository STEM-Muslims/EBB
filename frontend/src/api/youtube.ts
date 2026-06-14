const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "admin_token";

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface YouTubeUploadRequest {
  s3_key: string;
  title: string;
  description: string;
  privacy_status: "unlisted" | "public" | "private";
}

export interface YouTubeUploadResponse {
  success: boolean;
  youtube_video_id: string;
  youtube_url: string;
}

export const youtubeApi = {
  upload: async (data: YouTubeUploadRequest): Promise<YouTubeUploadResponse> => {
    const res = await fetch(`${BASE_URL}/youtube/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
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
};
