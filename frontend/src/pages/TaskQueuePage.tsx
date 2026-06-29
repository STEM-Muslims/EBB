import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tasksApi } from "../api/tasks";
import { useAdmin } from "../hooks/useAdmin";
import { crumbText, kindLabel } from "../lib/taskLabels";
import type { TaskView } from "../types/topics";

/** The to-do queue: pick up the next task you can do via accept/reject. */
export default function TaskQueuePage() {
  const { isAdmin } = useAdmin();
  const inProgressPath = isAdmin ? "/admin/tasks/in-progress" : "/tasks/in-progress";

  const [hasActive, setHasActive] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const [offer, setOffer] = useState<TaskView[] | null>(null);
  const [offerIdx, setOfferIdx] = useState(0);
  const [offerMsg, setOfferMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshActive() {
    try {
      const mine = await tasksApi.getMine();
      setHasActive(mine.length > 0);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    refreshActive();
  }, []);

  const current = offer && offerIdx < offer.length ? offer[offerIdx] : null;

  async function getNewTask() {
    setOfferMsg(null);
    setBusy(true);
    try {
      const queue = await tasksApi.getQueue();
      if (queue.length === 0) {
        setOffer(null);
        setOfferMsg("No tasks available right now.");
      } else {
        setOffer(queue);
        setOfferIdx(0);
      }
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!current) return;
    setBusy(true);
    try {
      await tasksApi.claim(current.id);
      setOffer(null);
      setOfferIdx(0);
      setOfferMsg("Task accepted — find it under In-progress.");
      await refreshActive();
    } catch (e) {
      setOfferMsg(e instanceof Error ? e.message : "Couldn’t take that task.");
      reject();
    } finally {
      setBusy(false);
    }
  }

  function reject() {
    if (!offer) return;
    const next = offerIdx + 1;
    if (next >= offer.length) {
      setOffer(null);
      setOfferIdx(0);
      setOfferMsg("No more tasks you can do right now.");
    } else {
      setOfferIdx(next);
    }
  }

  return (
    <div className="pageWrap" style={{ maxWidth: 720 }}>
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Tasks</span>
          <h1>Task queue</h1>
          <p className="pageSub">
            Pick up the next task you can do. Accept it to start, or reject to see
            the next one.
          </p>
        </div>
        <div className="pageActions">
          <button
            className="btn"
            onClick={getNewTask}
            disabled={busy || hasActive}
            title={hasActive ? "Finish or release your current task first" : undefined}
          >
            {busy ? "…" : "Get new task"}
          </button>
        </div>
      </div>

      {status === "loading" && <p className="emptyState">Loading…</p>}
      {status === "error" && <p className="emptyState">Couldn’t load tasks.</p>}

      {status === "ready" && hasActive && !current && (
        <p className="emptyState">
          You’re already working on a task. Finish or release it under{" "}
          <Link to={inProgressPath}>In-progress</Link> before taking another.
        </p>
      )}

      {current && (
        <div
          className="card card--pad-lg stack"
          style={{ gap: "0.75rem", borderColor: "var(--brand)" }}
        >
          <span className="pageEyebrow">Offered to you</span>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{current.topic_name}</h3>
            <span className="pill pill--stone">{kindLabel(current)}</span>
          </div>
          <p className="pageSub" style={{ margin: 0 }}>
            {crumbText(current)}
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--sm" onClick={accept} disabled={busy}>
              Accept
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={reject}
              disabled={busy}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {!current && offerMsg && <p className="emptyState">{offerMsg}</p>}
    </div>
  );
}
