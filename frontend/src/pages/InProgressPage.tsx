import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { tasksApi } from "../api/tasks";
import { topicsApi } from "../api/topics";
import { useAdmin } from "../hooks/useAdmin";
import { crumbText, kindLabel } from "../lib/taskLabels";
import type { TaskView } from "../types/topics";
import styles from "./user/user.module.css";

/** Tasks currently being worked on; filterable to just the viewer's own, where
 * they also get the upload / release controls. */
export default function InProgressPage() {
  const { isAdmin, email } = useAdmin();
  const detailBase = isAdmin ? "/admin/topics" : "/topics";

  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      setTasks(await tasksApi.getInProgress());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (onlyMine ? tasks.filter((t) => t.assignee_email === email) : tasks),
    [tasks, onlyMine, email],
  );

  return (
    <div className="pageWrap" style={{ maxWidth: 820 }}>
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Tasks</span>
          <h1>In progress</h1>
          <p className="pageSub">
            Tasks currently being worked on. Yours show upload and release controls.
          </p>
        </div>
        <div className="pageActions">
          {status === "ready" && (
            <span className="pill pill--stone">
              {visible.length} {visible.length === 1 ? "task" : "tasks"}
            </span>
          )}
          <button
            type="button"
            className={`btn btn--secondary btn--sm ${onlyMine ? styles.filterOn : ""}`}
            onClick={() => setOnlyMine((v) => !v)}
          >
            {onlyMine ? "By me" : "All"}
          </button>
        </div>
      </div>

      {status === "loading" && <p className="emptyState">Loading…</p>}
      {status === "error" && <p className="emptyState">Couldn’t load tasks.</p>}
      {status === "ready" && visible.length === 0 && (
        <p className="emptyState">
          {onlyMine
            ? "You have no active task. Pick one up from the Task queue."
            : "No tasks are being worked on."}
        </p>
      )}

      {status === "ready" && visible.length > 0 && (
        <div className="stack" style={{ gap: "0.6rem" }}>
          {visible.map((t) =>
            t.assignee_email === email ? (
              <MyTaskCard
                key={t.id}
                task={t}
                detailBase={detailBase}
                onDone={load}
              />
            ) : (
              <div
                key={t.id}
                className="card"
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "center",
                  padding: "0.7rem 0.9rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`${detailBase}/${t.topic_id}`}>
                    <strong>{t.topic_name}</strong>
                  </Link>{" "}
                  <span className="pill pill--stone">{kindLabel(t)}</span>
                  <div className="pageSub">{crumbText(t)}</div>
                </div>
                <span className="pageSub">{t.assignee_email}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function MyTaskCard({
  task,
  detailBase,
  onDone,
}: {
  task: TaskView;
  detailBase: string;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isTranslation = task.task_type === "TRANSLATION";

  async function handle(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      if (isTranslation) {
        await tasksApi.uploadCaption(task.id, file);
      } else {
        await topicsApi.uploadVideo(task.topic_id, { file });
      }
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="card card--pad-lg stack" style={{ gap: "0.6rem" }}>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <Link to={`${detailBase}/${task.topic_id}`}>
          <strong>{task.topic_name}</strong>
        </Link>
        <span className="pill pill--stone">{kindLabel(task)}</span>
        <span className="pill">you</span>
      </div>
      <p className="pageSub" style={{ margin: 0 }}>
        {crumbText(task)}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          ref={inputRef}
          type="file"
          accept={isTranslation ? ".vtt,.srt,text/vtt,application/x-subrip" : "video/*"}
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
          {busy ? "Uploading…" : isTranslation ? "Upload caption" : "Upload video"}
        </button>
        <button
          className="btn btn--secondary btn--sm"
          disabled={busy}
          onClick={async () => {
            await tasksApi.release(task.id);
            onDone();
          }}
        >
          Release
        </button>
      </div>
      {msg && <p className="pageSub">{msg}</p>}
    </div>
  );
}
