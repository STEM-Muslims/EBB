import { useState } from "react";
import { videosApi, type VideoUploadResponse } from "../api/videos";
import styles from "./UploadPage.module.css";

type Privacy = "unlisted" | "public" | "private";

const STEP_LABELS: Record<string, string> = {
  s3: "S3",
  youtube: "YouTube",
  database: "Database",
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("unlisted");

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<VideoUploadResponse | null>(null);
  const [error, setError] = useState("");

  function reset() {
    setStatus("idle");
    setResult(null);
    setError("");
  }

  async function submit() {
    if (!file) {
      setError("Please choose a video file.");
      setStatus("error");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const res = await videosApi.upload({
        file,
        title: title.trim(),
        description,
        privacy_status: privacy,
      });
      setResult(res);
      setStatus("done");
      if (res.success) {
        setFile(null);
        setTitle("");
        setDescription("");
        setPrivacy("unlisted");
      }
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
      setStatus("error");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Upload a video</h1>
        <p className={styles.sub}>
          Publishes to S3 and the EBB YouTube channel, and records it in the database.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Video details</h2>

        <div className={styles.field}>
          <label className={styles.label}>Video file</label>
          <input
            className={styles.input}
            type="file"
            accept="video/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              reset();
            }}
          />
          <span className={styles.hint}>The video file to upload (mp4, mov, …)</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              reset();
            }}
            placeholder="Lecture title"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              reset();
            }}
            placeholder="Optional description..."
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Visibility</label>
          <select
            className={styles.select}
            value={privacy}
            onChange={(e) => {
              setPrivacy(e.target.value as Privacy);
              reset();
            }}
          >
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {status === "error" && <p className={styles.error}>{error}</p>}

        {status === "done" && result && (
          <div className={styles.successBox}>
            <p
              className={result.success ? styles.successText : styles.error}
            >
              {result.message}
            </p>

            <div className={styles.steps}>
              {(["s3", "youtube", "database"] as const).map((key) => {
                const step = result.steps[key];
                return (
                  <div key={key} className={styles.step}>
                    <span className={styles.stepIcon}>{step.success ? "✓" : "✗"}</span>
                    <span className={styles.stepName}>{STEP_LABELS[key]}</span>
                    <span className={step.success ? styles.stepOk : styles.stepFail}>
                      {step.success ? "Success" : step.error ?? "Failed"}
                    </span>
                  </div>
                );
              })}
            </div>

            {result.video?.youtube_url && (
              <a
                className={styles.youtubeLink}
                href={result.video.youtube_url}
                target="_blank"
                rel="noreferrer"
              >
                {result.video.youtube_url}
              </a>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={submit}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Uploading…" : "Upload video"}
          </button>
        </div>
      </div>
    </div>
  );
}
