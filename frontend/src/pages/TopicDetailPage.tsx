import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { topicsApi } from "../api/topics";
import { tasksApi } from "../api/tasks";
import { useAdmin } from "../hooks/useAdmin";
import PostTaskForm from "../components/topics/PostTaskForm";
import type { TopicDetail, TopicDetailTask } from "../types/topics";

function youtubeEmbed(url: string): string | null {
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function TopicDetailPage() {
  const { id } = useParams();
  const topicId = Number(id);
  const { isAdmin, email } = useAdmin();

  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    topicsApi
      .getDetail(topicId)
      .then((d) => {
        setDetail(d);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <p className="emptyState">Loading…</p>;
  if (status === "error" || !detail)
    return <p className="emptyState">Couldn’t load this topic.</p>;

  const { topic, breadcrumb, tasks, translated_languages } = detail;
  const recordingTask = tasks.find(
    (t) => t.task_type === "RECORDING" && t.status === "IN_PROGRESS",
  );
  const canUploadVideo = isAdmin || recordingTask?.assignee_email === email;
  const translations = tasks.filter((t) => t.task_type === "TRANSLATION");
  const embed = topic.youtube_url ? youtubeEmbed(topic.youtube_url) : null;

  return (
    <div className="pageWrap" style={{ maxWidth: 820 }}>
      <div className="pageHead">
        <div className="pageHeadText">
          <nav className="pageEyebrow">
            {breadcrumb.map((b, i) => (
              <span key={b.id}>
                {i > 0 && " › "}
                {b.name}
              </span>
            ))}
          </nav>
          <h1>{topic.name}</h1>
          <p className="pageSub">
            Video status: <strong>{topic.video_state.toLowerCase()}</strong>
          </p>
        </div>
        <div className="pageActions">
          <Link to="/topics" className="btn btn--secondary btn--sm">
            ← Curriculum
          </Link>
        </div>
      </div>

      {/* ── Video ─────────────────────────────── */}
      <div className="card card--pad-lg stack" style={{ gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>Video</h3>
        {topic.video_state === "COMPLETED" && topic.youtube_url ? (
          embed ? (
            <div style={{ aspectRatio: "16 / 9", width: "100%" }}>
              <iframe
                src={embed}
                title={topic.name}
                style={{ width: "100%", height: "100%", border: 0 }}
                allowFullScreen
              />
            </div>
          ) : (
            <a href={topic.youtube_url} target="_blank" rel="noreferrer">
              Watch on YouTube
            </a>
          )
        ) : (
          <p className="pageSub">
            {recordingTask
              ? "A recording task is in progress, awaiting upload."
              : "No video yet. An admin can post a recording task below."}
          </p>
        )}

        {canUploadVideo && (
          <VideoUpload
            topicId={topic.id}
            onDone={load}
            replacing={topic.video_state === "COMPLETED"}
          />
        )}
        {topic.video_state === "COMPLETED" && topic.youtube_video_id && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="pill pill--stone">
              YouTube: {topic.youtube_privacy_status ?? "unknown"}
            </span>
            {isAdmin && topic.youtube_privacy_status !== "public" && (
              <button
                className="btn btn--sm"
                onClick={async () => {
                  await topicsApi.updateYoutubePrivacy(topic.id, "public");
                  load();
                }}
              >
                Make public on YouTube
              </button>
            )}
            {isAdmin && topic.youtube_privacy_status === "public" && (
              <button
                className="btn btn--secondary btn--sm"
                onClick={async () => {
                  await topicsApi.updateYoutubePrivacy(topic.id, "unlisted");
                  load();
                }}
              >
                Make unlisted
              </button>
            )}
          </div>
        )}
        {isAdmin && topic.video_state === "COMPLETED" && (
          <button
            className="btn btn--secondary btn--sm"
            onClick={async () => {
              await topicsApi.removeVideo(topic.id);
              load();
            }}
          >
            Take video down
          </button>
        )}
      </div>

      {/* ── Translations ──────────────────────── */}
      <div
        className="card card--pad-lg stack"
        style={{ gap: "1rem", marginTop: "1rem" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Translations</h3>
          {translated_languages.length > 0 && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {translated_languages.map((lang) => (
                <span key={lang.id} className="pill pill--stone">
                  {lang.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {translations.length === 0 && (
          <p className="pageSub">No translation tasks yet.</p>
        )}
        {translations.map((tr) => (
          <TranslationRow
            key={tr.id}
            task={tr}
            canUpload={
              (isAdmin || tr.assignee_email === email) &&
              tr.status === "IN_PROGRESS"
            }
            onDone={load}
          />
        ))}
      </div>

      {/* ── Admin: post a task ────────────────── */}
      {isAdmin && (
        <div
          className="card card--pad-lg stack"
          style={{ gap: "0.75rem", marginTop: "1rem" }}
        >
          <h3 style={{ margin: 0 }}>Post a task</h3>
          <PostTaskForm topic={topic} onPosted={load} />
        </div>
      )}
    </div>
  );
}

function VideoUpload({
  topicId,
  onDone,
  replacing,
}: {
  topicId: number;
  onDone: () => void;
  replacing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handle(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await topicsApi.uploadVideo(topicId, { file });
      setMsg(res.message);
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
      />
      <button
        className="btn btn--sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : replacing ? "Replace video" : "Upload video"}
      </button>
      {msg && <p className="pageSub" style={{ marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

function TranslationRow({
  task,
  canUpload,
  onDone,
}: {
  task: TopicDetailTask;
  canUpload: boolean;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    setBusy(true);
    try {
      await tasksApi.uploadCaption(task.id, file);
      onDone();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className="stack"
      style={{
        gap: "0.4rem",
        paddingBottom: "0.6rem",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <strong>{task.language?.name ?? `Language #${task.language_id}`}</strong>
        <span className="pill pill--stone">{task.status.toLowerCase()}</span>
        {task.assignee_email && (
          <span className="pageSub">{task.assignee_email}</span>
        )}
      </div>
      {task.caption_s3_url && (
        <a href={task.caption_s3_url} target="_blank" rel="noreferrer">
          Caption file
        </a>
      )}
      {canUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".vtt,.srt,text/vtt,application/x-subrip"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handle(f);
            }}
          />
          <button
            className="btn btn--secondary btn--sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy
              ? "Uploading…"
              : task.status === "COMPLETED"
                ? "Replace caption"
                : "Upload caption"}
          </button>
        </div>
      )}
    </div>
  );
}
