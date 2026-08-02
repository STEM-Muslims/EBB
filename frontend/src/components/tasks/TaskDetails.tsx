import { Fragment, useState, type ReactNode } from "react";
import { crumbText, kindLabel } from "../../lib/taskLabels";
import type { TaskStatus, TaskView } from "../../types/topics";

const STATUS_LABEL: Record<TaskStatus, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In progress",
  RELEASED: "Released",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function when(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

/** Everything about a task that doesn't fit on its card, behind a toggle. */
export default function TaskDetailsToggle({ task }: { task: TaskView }) {
  const [open, setOpen] = useState(false);

  const rows: { label: string; value: ReactNode }[] = [
    { label: "Type", value: kindLabel(task) },
    {
      label: "Status",
      value: <span className="pill pill--stone">{STATUS_LABEL[task.status]}</span>,
    },
    { label: "Path", value: crumbText(task) },
    { label: "Assignee", value: task.assignee_name ?? task.assignee_email },
    {
      label: "Queue position",
      value: task.status === "QUEUED" ? task.queue_order : null,
    },
    { label: "Requested", value: when(task.requested_at) },
    { label: "Claimed", value: when(task.claimed_at) },
    { label: "Released", value: when(task.released_at) },
    { label: "Completed", value: when(task.completed_at) },
    {
      label: "Caption",
      value: task.caption_s3_url ? (
        <a href={task.caption_s3_url} target="_blank" rel="noreferrer">
          Caption file
        </a>
      ) : null,
    },
  ].filter((r) => r.value !== null && r.value !== undefined && r.value !== "");

  return (
    <div style={{ marginTop: "0.4rem" }}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ minHeight: 0, padding: "0.2rem 0.4rem" }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Details ▴" : "Details ▾"}
      </button>
      {open && (
        <dl
          className="card"
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            gap: "0.3rem 0.75rem",
            margin: "0.4rem 0 0",
            padding: "0.6rem 0.8rem",
            boxShadow: "none",
            fontSize: "0.85rem",
          }}
        >
          {rows.map((r) => (
            <Fragment key={r.label}>
              <dt className="pageSub" style={{ fontWeight: 600 }}>
                {r.label}
              </dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{r.value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}
