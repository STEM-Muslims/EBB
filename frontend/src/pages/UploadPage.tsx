import { useState } from "react";
import { videosApi, type VideoUploadResponse } from "../api/videos";
import styles from "./UploadPage.module.css";

type Privacy = "unlisted" | "public" | "private";

const STEP_LABELS: Record<string, string> = {
  s3: "S3",
  youtube: "YouTube",
  database: "Database",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

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
    <div className="pageWrap" style={{ maxWidth: 680 }}>
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Publish</span>
          <h1>Upload a video</h1>
          <p className="pageSub">
            Publishes to S3 and the EBB YouTube channel, and records it in the
            database.
          </p>
        </div>
      </div>

      <div className="card card--pad-lg stack" style={{ gap: "1.25rem" }}>
        <div className={styles.field}>
          <label className={styles.label}>Video file</label>
          <label className={`${styles.dropzone} ${file ? styles.dropzoneFilled : ""}`}>
            <input
              type="file"
              accept="video/*"
              className={styles.fileInput}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                reset();
              }}
            />
            {file ? (
              <>
                <span className={styles.dropIcon} aria-hidden="true">
                  ▶
                </span>
                <span className={styles.dropMain}>{file.name}</span>
                <span className={styles.dropSub}>
                  {formatBytes(file.size)} · Click to replace
                </span>
              </>
            ) : (
              <>
                <span className={styles.dropIcon} aria-hidden="true">
                  ↑
                </span>
                <span className={styles.dropMain}>Choose a video file</span>
                <span className={styles.dropSub}>mp4, mov, and similar formats</span>
              </>
            )}
          </label>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input
            className="input"
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
            className="textarea"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              reset();
            }}
            placeholder="Optional description…"
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Visibility</label>
          <select
            className="select"
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
          <div
            className={styles.successBox}
            data-ok={result.success ? "true" : "false"}
          >
            <p className={result.success ? styles.successText : styles.error}>
              {result.message}
            </p>

            <div className={styles.steps}>
              {(["s3", "youtube", "database"] as const).map((key) => {
                const step = result.steps[key];
                return (
                  <div key={key} className={styles.step}>
                    <span
                      className={step.success ? styles.stepOk : styles.stepFail}
                      aria-hidden="true"
                    >
                      {step.success ? "✓" : "✗"}
                    </span>
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
            className="btn"
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
