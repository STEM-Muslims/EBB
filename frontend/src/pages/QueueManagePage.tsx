import { useCallback, useEffect, useState } from "react";
import { tasksApi } from "../api/tasks";
import QueueManager from "../components/topics/QueueManager";
import type { TaskView } from "../types/topics";

/** Admin-only: reorder the to-do queue and requeue released tasks. */
export default function QueueManagePage() {
  const [queue, setQueue] = useState<TaskView[]>([]);
  const [released, setReleased] = useState<TaskView[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      const [q, r] = await Promise.all([
        tasksApi.getQueue(),
        tasksApi.getReleased(),
      ]);
      setQueue(q);
      setReleased(r);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="pageWrap" style={{ maxWidth: 820 }}>
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Tasks</span>
          <h1>Queue management</h1>
          <p className="pageSub">
            Drag to reorder the to-do queue, and requeue released tasks.
          </p>
        </div>
      </div>

      {status === "loading" && (
        <div className="loadingState">
          <div className="spinner"></div>
          <span>Loading…</span>
        </div>
      )}
      {status === "error" && <p className="emptyState">Couldn’t load the queue.</p>}
      {status === "ready" && (
        <div className="card card--pad-lg">
          <QueueManager queue={queue} released={released} onChanged={load} />
        </div>
      )}
    </div>
  );
}
