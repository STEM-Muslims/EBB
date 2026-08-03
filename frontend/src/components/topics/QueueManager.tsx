import { useState } from "react";
import { tasksApi } from "../../api/tasks";
import { groupBySubject } from "../../lib/queueGroups";
import { crumbText, kindLabel } from "../../lib/taskLabels";
import type { Breadcrumb, TaskView } from "../../types/topics";
import TaskDetailsPanel from "../tasks/TaskDetails";

function title(t: TaskView) {
  return t.topic_name ?? `Topic #${t.topic_id}`;
}

const rowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.6rem",
  padding: "0.5rem 0.7rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface)",
} as const;

/** Admin view of the to-do queue, split by subject, plus the released list. */
export default function QueueManager({
  queue,
  released,
  onChanged,
}: {
  queue: TaskView[];
  released: TaskView[];
  onChanged: () => void;
}) {
  async function handleDelete(task: TaskView) {
    if (!window.confirm(`Remove "${title(task)}" from the queue?`)) {
      return;
    }
    try {
      await tasksApi.delete(task.id);
    } catch {
      alert("Failed to remove task from the queue.");
    }
    onChanged();
  }

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.5rem" }}>To-do queue ({queue.length})</h3>
        {queue.length === 0 ? (
          <p className="pageSub">The queue is empty.</p>
        ) : (
          <div className="stack" style={{ gap: "0.8rem" }}>
            {groupBySubject(queue).map(({ subject, tasks }) => (
              <div
                key={subject?.id ?? "unfiled"}
                className="stack"
                style={{ gap: "0.4rem" }}
              >
                <SubjectHeading subject={subject} count={tasks.length} />
                {tasks.map((t) => (
                  <QueueRow key={t.id} task={t} onDelete={handleDelete} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ margin: "0 0 0.5rem" }}>Released ({released.length})</h3>
        {released.length === 0 ? (
          <p className="pageSub">Nothing released.</p>
        ) : (
          <div className="stack" style={{ gap: "0.8rem" }}>
            {groupBySubject(released).map(({ subject, tasks }) => (
              <div
                key={subject?.id ?? "unfiled"}
                className="stack"
                style={{ gap: "0.4rem" }}
              >
                <SubjectHeading subject={subject} count={tasks.length} />
                {tasks.map((t) => (
                  <ReleasedRow
                    key={t.id}
                    task={t}
                    onDelete={handleDelete}
                    onRequeue={async () => {
                      await tasksApi.requeue(t.id);
                      onChanged();
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A queued task row: click anywhere on it for details. */
function QueueRow({
  task,
  onDelete,
}: {
  task: TaskView;
  onDelete: (task: TaskView) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ ...rowStyle, cursor: "pointer" }}
      onClick={() => setOpen((v) => !v)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{title(task)}</strong>{" "}
        <span className="pill pill--stone">{kindLabel(task)}</span>
        <div className="pageSub">{crumbText(task)}</div>
        <TaskDetailsPanel task={task} open={open} />
      </div>
      <button
        className="btn btn--ghost btn--sm"
        style={{ color: "var(--danger, #ef4444)" }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task);
        }}
        title="Remove from queue"
      >
        Remove
      </button>
    </div>
  );
}

/** A released task row: click anywhere on it for details. */
function ReleasedRow({
  task,
  onDelete,
  onRequeue,
}: {
  task: TaskView;
  onDelete: (task: TaskView) => void;
  onRequeue: () => void;
}) {
  const [open, setOpen] = useState(false);
  const by = task.assignee_name ?? task.assignee_email;
  return (
    <div
      style={{ ...rowStyle, cursor: "pointer" }}
      onClick={() => setOpen((v) => !v)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{title(task)}</strong>{" "}
        <span className="pill pill--stone">{kindLabel(task)}</span>
        <div className="pageSub">
          {crumbText(task)}
          {by && ` · released by ${by}`}
        </div>
        <TaskDetailsPanel task={task} open={open} />
      </div>
      <div
        style={{ display: "flex", gap: "0.4rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="btn btn--secondary btn--sm" onClick={onRequeue}>
          Requeue
        </button>
        <button
          className="btn btn--ghost btn--sm"
          style={{ color: "var(--danger, #ef4444)" }}
          onClick={() => onDelete(task)}
          title="Remove from queue"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function SubjectHeading({
  subject,
  count,
}: {
  subject: Breadcrumb | null;
  count: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <h4 style={{ margin: 0, fontSize: "0.95rem" }}>
        {subject?.name ?? "Unfiled"}
      </h4>
      <span className="pill pill--stone">{count}</span>
    </div>
  );
}
