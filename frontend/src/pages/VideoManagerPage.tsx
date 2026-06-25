import { useEffect, useMemo, useState } from "react";
import { videosApi, type Video } from "../api/videos";
import { useAdmin } from "../hooks/useAdmin";
import styles from "./VideoManagerPage.module.css";

export default function VideoManagerPage() {
  const { email, loading: authLoading } = useAdmin();

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Manage videos</h1>
        <p className={styles.sub}>
          Every uploaded video. You can only remove the ones you uploaded.
        </p>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          <span>Only mine</span>
        </label>
        <button className={styles.btnGhost} onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {notice && <p className={styles.notice}>{notice}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {loading || authLoading ? (
        <p className={styles.muted}>Loading…</p>
      ) : visible.length === 0 ? (
        <p className={styles.muted}>
          {onlyMine ? "You haven't uploaded any videos yet." : "No videos found."}
        </p>
      ) : (
        <div className={styles.list}>
          {visible.map((v) => {
            const owned = mine(v);
            return (
              <div key={v.id} className={styles.card}>
                <div className={styles.cardMain}>
                  <div className={styles.titleRow}>
                    <span className={styles.title}>{v.title}</span>
                    <span className={styles.status}>{v.status}</span>
                  </div>

                  <div className={styles.meta}>
                    <span>{v.uploaded_by ?? "unknown uploader"}</span>
                    <span className={styles.dot}>·</span>
                    <span>{new Date(v.created_at).toLocaleDateString()}</span>
                    <span className={styles.dot}>·</span>
                    <span>{v.privacy_status}</span>
                  </div>

                  <div className={styles.links}>
                    {v.youtube_url && (
                      <a href={v.youtube_url} target="_blank" rel="noreferrer">
                        YouTube
                      </a>
                    )}
                    {v.s3_url && (
                      <a href={v.s3_url} target="_blank" rel="noreferrer">
                        S3
                      </a>
                    )}
                  </div>
                </div>

                <button
                  className={styles.btnDanger}
                  onClick={() => remove(v)}
                  disabled={!owned || removingId === v.id}
                  title={
                    owned
                      ? "Remove from S3, unlist on YouTube, delete record"
                      : "Only the uploader can remove this video"
                  }
                >
                  {removingId === v.id ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
