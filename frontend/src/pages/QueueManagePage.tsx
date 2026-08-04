import { useCallback, useEffect, useState } from "react";
import { tasksApi } from "../api/tasks";
import Breadcrumb from "../components/Breadcrumb";
import QueueManager from "../components/topics/QueueManager";
import type { TaskView } from "../types/topics";

/** Admin-only: review the to-do queue by subject and requeue released tasks. */
export default function QueueManagePage() {
  const [queue, setQueue] = useState<TaskView[]>([]);
  const [released, setReleased] = useState<TaskView[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      const [q, r] = await Promise.all([
        tasksApi.getFullQueue(),
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
          <Breadcrumb
            items={[
              { label: "Tasks", to: "/admin/tasks/queue" },
              { label: "Queue management" },
            ]}
          />
          <h1>Queue management</h1>
          <p className="pageSub">
            The to-do queue, split by subject and newest first, plus released
            tasks you can requeue.
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
