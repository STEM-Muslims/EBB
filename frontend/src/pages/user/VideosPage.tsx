import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { videosApi, type Video } from "../../api/videos";
import { useAdmin } from "../../hooks/useAdmin";
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
  const { email } = useAdmin();
  const [videos, setVideos] = useState<Video[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
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

  const visible = useMemo(
    () =>
      onlyMine
        ? videos.filter((v) => !!email && v.uploaded_by === email)
        : videos,
    [videos, onlyMine, email],
  );

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Library</span>
          <h1>Video lessons</h1>
          <p className="pageSub">Published lessons available to watch.</p>
        </div>
        <div className="pageActions">
          {status === "ready" && (
            <span className="pill pill--stone">
              {visible.length} {visible.length === 1 ? "lesson" : "lessons"}
            </span>
          )}
          <button
            type="button"
            className={`btn btn--secondary btn--sm ${onlyMine ? styles.filterOn : ""}`}
            onClick={() => setOnlyMine((v) => !v)}
          >
            {onlyMine ? "My uploads" : "All videos"}
          </button>
          <Link to="/upload" className="btn btn--sm">
            Upload
          </Link>
        </div>
      </div>

      {status === "loading" && (
        <div className={styles.videoList}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`card ${styles.skeletonCard}`} />
          ))}
        </div>
      )}
      {status === "error" && (
        <p className="emptyState">Couldn’t load videos. Please try again later.</p>
      )}
      {status === "ready" && visible.length === 0 && (
        <p className="emptyState">
          {onlyMine
            ? "You haven’t uploaded any videos yet."
            : "No videos have been published yet."}
        </p>
      )}

      {status === "ready" && visible.length > 0 && (
        <div className={styles.videoList}>
          {visible.map((v) => (
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
