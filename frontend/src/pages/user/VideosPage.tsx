import { useEffect, useState } from "react";
import { videosApi, type Video } from "../../api/videos";
import styles from "./user.module.css";

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

export default function UserVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    videosApi
      .list()
      .then((data) => {
        setVideos(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <h1>Video lessons</h1>
        <p className="pageSub">Published lessons available to watch.</p>
      </div>

      {status === "loading" && <p className="emptyState">Loading videos…</p>}
      {status === "error" && (
        <p className="emptyState">Couldn’t load videos. Please try again later.</p>
      )}
      {status === "ready" && videos.length === 0 && (
        <p className="emptyState">No videos have been published yet.</p>
      )}

      {status === "ready" && videos.length > 0 && (
        <div className={styles.videoList}>
          {videos.map((v) => (
            <article key={v.id} className={`card ${styles.videoCard}`}>
              <div className={styles.videoInfo}>
                <h3 className={styles.videoTitle}>{v.title}</h3>
                {v.description && (
                  <p className={styles.videoDesc}>{v.description}</p>
                )}
                <div className={styles.videoMeta}>
                  <span>Uploaded by {v.uploaded_by ?? "unknown"}</span>
                  {v.created_at && <span>Added {formatDate(v.created_at)}</span>}
                  {v.privacy_status && (
                    <span>Visibility: {v.privacy_status}</span>
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
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
