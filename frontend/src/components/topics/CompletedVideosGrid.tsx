import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { topicsApi } from "../../api/topics";
import { useAdmin } from "../../hooks/useAdmin";
import type { CompletedTopic } from "../../types/topics";
import styles from "../../pages/user/user.module.css";

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

/** The "Videos Uploaded" view — every topic whose video is completed. */
export default function CompletedVideosGrid({
  detailBase,
}: {
  detailBase: string; // e.g. "/topics" or "/admin/topics"
}) {
  const { email, isAdmin } = useAdmin();
  const [items, setItems] = useState<CompletedTopic[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    topicsApi
      .getCompleted()
      .then((data) => {
        setItems(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const visible = useMemo(
    () =>
      onlyMine
        ? items.filter((t) => !!email && t.uploaded_by === email)
        : items,
    [items, onlyMine, email],
  );

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Library</span>
          <h1>Videos uploaded</h1>
          <p className="pageSub">
            Topics whose video has been recorded. Open one to watch it and see
            where it sits in the curriculum.
          </p>
        </div>
        <div className="pageActions">
          {status === "ready" && (
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
        </div>
      </div>

      {status === "loading" && (
        <div className="loadingState">
          <div className="spinner"></div>
          <span>Loading videos…</span>
        </div>
      )}
      {status === "error" && (
        <p className="emptyState">Couldn’t load videos. Please try again later.</p>
      )}
      {status === "ready" && visible.length === 0 && (
        <p className="emptyState">
          {onlyMine
            ? "You haven’t uploaded any videos yet."
            : "No videos have been uploaded yet."}
        </p>
      )}

      {status === "ready" && visible.length > 0 && (
        <div className={styles.videoList}>
          {visible.map((t) => (
            <Link
              key={t.id}
              to={`${detailBase}/${t.id}`}
              className={`card ${styles.videoCard}`}
              style={{ textDecoration: "none" }}
            >
              <span className={styles.videoThumb} aria-hidden="true">
                ▶
              </span>
              <div className={styles.videoInfo}>
                <h3 className={styles.videoTitle}>{t.name}</h3>
                <p className={styles.videoDesc}>
                  {t.breadcrumb.map((b) => b.name).join(" › ")}
                </p>
                <div className={styles.videoMeta}>
                  <span>Uploaded by {t.uploaded_by ?? "unknown"}</span>
                  {t.video_uploaded_at && (
                    <span>Added {formatDate(t.video_uploaded_at)}</span>
                  )}
                  {isAdmin && t.s3_url && <span>S3 available</span>}
                  {t.youtube_privacy_status && (
                    <span>YouTube: {t.youtube_privacy_status}</span>
                  )}
                </div>
                {t.translated_languages.length > 0 && (
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    {t.translated_languages.map((lang) => (
                      <span key={lang.id} className="pill pill--stone" style={{ fontSize: "0.7rem" }}>
                        {lang.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.videoActions}>
                <span className="btn btn--sm">Open</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
