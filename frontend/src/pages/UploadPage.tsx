import { useState } from "react";
import { youtubeApi, type YouTubeUploadRequest } from "../api/youtube";
import styles from "./UploadPage.module.css";

const DEFAULT_FORM: YouTubeUploadRequest = {
  s3_key: "",
  title: "",
  description: "",
  privacy_status: "unlisted",
};

export default function UploadPage() {
  const [form, setForm] = useState<YouTubeUploadRequest>(DEFAULT_FORM);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [error, setError] = useState("");

  function update<K extends keyof YouTubeUploadRequest>(key: K, value: YouTubeUploadRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
    setError("");
  }

  async function submit() {
    if (!form.s3_key.trim() || !form.title.trim()) {
      setError("S3 key and title are required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const result = await youtubeApi.upload(form);
      setYoutubeUrl(result.youtube_url);
      setStatus("success");
      setForm(DEFAULT_FORM);
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
      setStatus("error");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Upload to YouTube</h1>
        <p className={styles.sub}>Publish a video from S3 to the EBB YouTube channel</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Video details</h2>

        <div className={styles.field}>
          <label className={styles.label}>S3 Key</label>
          <input
            className={styles.input}
            value={form.s3_key}
            onChange={(e) => update("s3_key", e.target.value)}
            placeholder="videos/my-lecture.mp4"
          />
          <span className={styles.hint}>The path to the file inside your S3 bucket</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Lecture title"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Optional description..."
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Visibility</label>
          <select
            className={styles.select}
            value={form.privacy_status}
            onChange={(e) =>
              update("privacy_status", e.target.value as YouTubeUploadRequest["privacy_status"])
            }
          >
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {status === "error" && <p className={styles.error}>{error}</p>}

        {status === "success" && (
          <div className={styles.successBox}>
            <p className={styles.successText}>Uploaded successfully.</p>
            <a
              className={styles.youtubeLink}
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
            >
              {youtubeUrl}
            </a>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={submit}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Uploading…" : "Upload to YouTube"}
          </button>
        </div>
      </div>
    </div>
  );
}
