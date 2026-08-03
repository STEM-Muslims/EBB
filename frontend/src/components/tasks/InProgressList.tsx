import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { tasksApi } from "../../api/tasks";
import { topicsApi } from "../../api/topics";
import TaskDetailsPanel from "./TaskDetails";
import { useAdmin } from "../../hooks/useAdmin";
import { crumbText, kindLabel } from "../../lib/taskLabels";
import type { TaskView } from "../../types/topics";

/** Tasks currently being worked on; the viewer's own carry the upload / release
 * controls. The owning page holds the data, the All / by-you filter and the
 * count, so this renders whatever it is handed. */
export default function InProgressList({
  tasks,
  state,
  onlyMine,
  onReload,
}: {
  tasks: TaskView[];
  state: "loading" | "ready" | "error";
  onlyMine: boolean;
  onReload: () => void;
}) {
  const { isAdmin, email } = useAdmin();
  const detailBase = isAdmin ? "/admin/topics" : "/topics";

  return (
    <>
      {state === "loading" && (
        <div className="loadingState">
          <div className="spinner"></div>
          <span>Loading…</span>
        </div>
      )}
      {state === "error" && (
        <p className="emptyState" style={{ margin: 0 }}>
          Couldn’t load tasks.
        </p>
      )}
      {state === "ready" && tasks.length === 0 && (
        <p className="emptyState" style={{ margin: 0 }}>
          {onlyMine ? "You have no task in progress." : "Nothing is in progress."}
        </p>
      )}

      {state === "ready" && tasks.length > 0 && (
        <div className="stack" style={{ gap: "0.6rem" }}>
          {tasks.map((t) =>
            t.assignee_email === email ? (
              <MyTaskCard
                key={t.id}
                task={t}
                detailBase={detailBase}
                onDone={onReload}
              />
            ) : (
              <TeammateTaskCard key={t.id} task={t} detailBase={detailBase} />
            ),
          )}
        </div>
      )}
    </>
  );
}

/** A teammate's in-progress task: click anywhere on the card for details. */
function TeammateTaskCard({
  task,
  detailBase,
}: {
  task: TaskView;
  detailBase: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="card"
      onClick={() => setOpen((v) => !v)}
      style={{
        display: "flex",
        gap: "0.6rem",
        alignItems: "center",
        padding: "0.7rem 0.9rem",
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          to={`${detailBase}/${task.topic_id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <strong>{task.topic_name}</strong>
        </Link>{" "}
        <span className="pill pill--stone">{kindLabel(task)}</span>
        <div className="pageSub">{crumbText(task)}</div>
        <TaskDetailsPanel task={task} open={open} />
      </div>
      <span className="pageSub">{task.assignee_name ?? task.assignee_email}</span>
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
  const [open, setOpen] = useState(false);
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
    <div
      className="card card--pad-lg stack"
      onClick={() => setOpen((v) => !v)}
      style={{ gap: "0.6rem", cursor: "pointer" }}
    >
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <Link
          to={`${detailBase}/${task.topic_id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <strong>{task.topic_name}</strong>
        </Link>
        <span className="pill pill--stone">{kindLabel(task)}</span>
        <span className="pill">you</span>
      </div>
      <p className="pageSub" style={{ margin: 0 }}>
        {crumbText(task)}
      </p>
      <TaskDetailsPanel task={task} open={open} />
      <div
        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
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
