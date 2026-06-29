import { useEffect, useMemo, useState } from "react";
import { videosApi, type Video } from "../api/videos";
import { useAdmin } from "../hooks/useAdmin";
import styles from "./user/user.module.css";

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function VideoManagerPage() {
  const { email, isAdmin, loading: authLoading } = useAdmin();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);

  const [removingId, setRemovingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setVideos(await videosApi.list());
    } catch (e: any) {
      setError(e.message ?? "Failed to load videos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const mine = (v: Video) => !!email && v.uploaded_by === email;

  const visible = useMemo(
    () => (onlyMine ? videos.filter(mine) : videos),
    [videos, onlyMine, email],
  );

  async function remove(video: Video) {
    if (
      !window.confirm(
        `Remove "${video.title}"?\n\nThis deletes it from S3, makes it private on ` +
          `YouTube, and removes the database record. This cannot be undone.`,
      )
    ) {
      return;
    }

    setRemovingId(video.id);
    setNotice("");
    setError("");
    try {
      const res = await videosApi.remove(video.id);
      setNotice(res.message);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
    } catch (e: any) {
      setError(e.message ?? "Failed to remove video.");
    } finally {
      setRemovingId(null);
    }
  }

  const busy = loading || authLoading;

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Library</span>
          <h1>Manage videos</h1>
          <p className="pageSub">
            Every uploaded video. You can only remove the ones you uploaded.
          </p>
        </div>
        <div className="pageActions">
          {!busy && (
            <span className="pill pill--stone">
              {visible.length} {visible.length === 1 ? "video" : "videos"}
            </span>
          )}
          <button
            type="button"
            className={`btn btn--secondary btn--sm ${onlyMine ? styles.filterOn : ""}`}
            onClick={() => setOnlyMine((v) => !v)}
          >
            {onlyMine ? "My uploads" : "All videos"}
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {notice && <p className={styles.notice}>{notice}</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {busy && (
        <div className={styles.videoList}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`card ${styles.skeletonCard}`} />
          ))}
        </div>
      )}

      {!busy && visible.length === 0 && (
        <p className="emptyState">
          {onlyMine
            ? "You haven’t uploaded any videos yet."
            : "No videos found."}
        </p>
      )}

      {!busy && visible.length > 0 && (
        <div className={styles.videoList}>
          {visible.map((v) => {
            const owned = mine(v);
            return (
              <article key={v.id} className={`card ${styles.videoCard}`}>
                <span className={styles.videoThumb} aria-hidden="true">
                  ▶
                </span>
                <div className={styles.videoInfo}>
                  <h3 className={styles.videoTitle}>{v.title}</h3>
                  {v.description && (
                    <p className={styles.videoDesc}>{v.description}</p>
                  )}
                  <div className={styles.videoMeta}>
                    <span className={`pill pill--stone ${styles.videoStatus}`}>
                      {v.status}
                    </span>
                    <span>Uploaded by {v.uploaded_by ?? "unknown"}</span>
                    {v.created_at && <span>Added {formatDate(v.created_at)}</span>}
                    {v.privacy_status && (
                      <span>Visibility: {v.privacy_status}</span>
                    )}
                    {v.youtube_url && (
                      <a
                        className={styles.videoLink}
                        href={v.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        YouTube
                      </a>
                    )}
                    {isAdmin && v.s3_url && (
                      <a
                        className={styles.videoLink}
                        href={v.s3_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        S3
                      </a>
                    )}
                  </div>
                </div>
                <div className={styles.videoActions}>
                  {v.youtube_url ? (
                    <a
                      className="btn btn--sm"
                      href={v.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch
                    </a>
                  ) : (
                    <span className="pill pill--stone">Processing</span>
                  )}
                  <button
                    className={styles.btnRemove}
                    onClick={() => remove(v)}
                    disabled={(!owned && !isAdmin) || removingId === v.id}
                    title={
                      owned || isAdmin
                        ? "Remove from S3, make private on YouTube, delete record"
                        : "Only the uploader can remove this video"
                    }
                  >
                    {removingId === v.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
