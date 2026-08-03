import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { tasksApi } from "../api/tasks";
import InProgressList from "../components/tasks/InProgressList";
import TaskDetailsPanel from "../components/tasks/TaskDetails";
import { useAdmin } from "../hooks/useAdmin";
import { groupBySubject } from "../lib/queueGroups";
import { crumbText, kindLabel } from "../lib/taskLabels";
import type { TaskView } from "../types/topics";
import styles from "./user/user.module.css";

const SUB = {
  queue: "Tasks waiting to be picked up.",
  "in-progress": "Tasks being worked on right now.",
};

/** The tasks page: the queue you accept work from, plus what's in progress. */
export default function TaskQueuePage() {
  const { isAdmin, email } = useAdmin();
  const { pathname } = useLocation();
  const base = pathname.startsWith("/admin") ? "/admin/tasks" : "/tasks";
  const view = pathname.endsWith("/in-progress") ? "in-progress" : "queue";

  const [hasActive, setHasActive] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [queue, setQueue] = useState<TaskView[]>([]);
  const [inProgress, setInProgress] = useState<TaskView[] | null>(null);
  const [inProgressState, setInProgressState] =
    useState<"loading" | "ready" | "error">("loading");
  const [onlyMine, setOnlyMine] = useState(false);

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

  async function loadQueue() {
    try {
      setQueue(await tasksApi.getFullQueue());
    } catch {
      /* keep whatever we had */
    }
  }

  async function loadInProgress() {
    try {
      setInProgress(await tasksApi.getInProgress());
      setInProgressState("ready");
    } catch {
      setInProgressState("error");
    }
  }

  useEffect(() => {
    refreshActive();
    loadQueue();
    loadInProgress();
  }, []);

  const current = offer && offerIdx < offer.length ? offer[offerIdx] : null;
  const eligible = queue.filter((t) => t.eligible);
  const ineligible = queue.filter((t) => !t.eligible);

  // The in-progress tab counts exactly what its list shows, filter included.
  const mine = useMemo(
    () => (inProgress ?? []).filter((t) => !onlyMine || t.assignee_email === email),
    [inProgress, onlyMine, email],
  );

  async function getNewTask() {
    setOfferMsg(null);
    setBusy(true);
    try {
      const queue = await tasksApi.getQueue();
      if (queue.length === 0) {
        setOffer(null);
        setOfferMsg("Nothing available right now.");
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
      setOfferMsg("Task accepted — see it under In progress.");
      await refreshActive();
      await loadQueue();
      await loadInProgress();
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
      setOfferMsg("Nothing else you can do right now.");
    } else {
      setOfferIdx(next);
    }
  }

  return (
    <div className="pageWrap" style={{ maxWidth: 820 }}>
      <div className="pageHead">
        <div className="pageHeadText">
          <h1>Tasks</h1>
          <p className="pageSub">{SUB[view]}</p>
        </div>
        <div className="pageActions">
          <nav className="segmented">
            <ViewTab
              to={`${base}/queue`}
              label="Queue"
              count={status === "ready" ? queue.length : null}
              active={view === "queue"}
            />
            <ViewTab
              to={`${base}/in-progress`}
              label="In progress"
              count={inProgressState === "ready" ? mine.length : null}
              active={view === "in-progress"}
            />
          </nav>
          {view === "queue" ? (
            <button
              className="btn"
              onClick={getNewTask}
              disabled={busy || hasActive}
              title={hasActive ? "Finish or release your current task first" : undefined}
            >
              {busy ? "…" : "Get new task"}
            </button>
          ) : (
            <button
              type="button"
              className={`btn btn--secondary btn--sm ${onlyMine ? styles.filterOn : ""}`}
              onClick={() => setOnlyMine((v) => !v)}
            >
              {onlyMine ? "By you" : "All"}
            </button>
          )}
        </div>
      </div>

      {view === "in-progress" ? (
        <InProgressList
          tasks={mine}
          state={inProgressState}
          onlyMine={onlyMine}
          onReload={loadInProgress}
        />
      ) : (
        <div className="stack" style={{ gap: "1.25rem" }}>
          {status === "loading" && (
            <div className="loadingState">
              <div className="spinner"></div>
              <span>Loading…</span>
            </div>
          )}
          {status === "error" && (
            <p className="emptyState" style={{ margin: 0 }}>
              Couldn’t load tasks.
            </p>
          )}

          {status === "ready" && hasActive && !current && (
            <p className="emptyState" style={{ margin: 0 }}>
              You’re already on a task. Finish or release it in{" "}
              <Link to={`${base}/in-progress`}>In progress</Link> first.
            </p>
          )}

          {current && (
            <div
              className="card card--pad-lg stack"
              style={{ gap: "0.75rem", borderColor: "var(--brand)" }}
            >
              <span className="pageEyebrow">Offered to you</span>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "1rem" }}>
                  {current.topic_name}
                </h2>
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

          {!current && offerMsg && (
            <p className="emptyState" style={{ margin: 0 }}>
              {offerMsg}
            </p>
          )}

          {/* Full queue (visibility only; claim via "Get new task") */}
          {status === "ready" && queue.length === 0 && (
            <p className="emptyState" style={{ margin: 0 }}>
              The queue is empty.
            </p>
          )}

          {status === "ready" &&
            queue.length > 0 &&
            (isAdmin ? (
              groupBySubject(queue).map(({ subject, tasks }) => (
                <Section
                  key={subject?.id ?? "unfiled"}
                  heading={subject?.name ?? "Unfiled"}
                  count={tasks.length}
                >
                  {tasks.map((t) => (
                    <QueueCard key={t.id} task={t} />
                  ))}
                </Section>
              ))
            ) : (
              <>
                <Section heading="Available to you" count={eligible.length}>
                  {eligible.length === 0 ? (
                    <p className="pageSub" style={{ margin: 0 }}>
                      Nothing here is open to you.
                    </p>
                  ) : (
                    eligible.map((t) => <QueueCard key={t.id} task={t} />)
                  )}
                </Section>

                {ineligible.length > 0 && (
                  <Section heading="Not open to you" count={ineligible.length}>
                    <p className="pageSub" style={{ margin: 0 }}>
                      Outside the subjects you teach and the languages you
                      translate.
                    </p>
                    {ineligible.map((t) => (
                      <QueueCard key={t.id} task={t} dimmed />
                    ))}
                  </Section>
                )}
              </>
            ))}
        </div>
      )}
    </div>
  );
}

function ViewTab({
  to,
  label,
  count,
  active,
}: {
  to: string;
  label: string;
  count: number | null;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`segmentedItem ${active ? "segmentedItemActive" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
      {count !== null && <span className="segmentedCount">{count}</span>}
    </Link>
  );
}

function Section({
  heading,
  count,
  children,
}: {
  heading: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="stack" style={{ gap: "0.6rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{heading}</h2>
        <span className="pill pill--stone">{count}</span>
      </div>
      {children}
    </section>
  );
}

function QueueCard({ task, dimmed }: { task: TaskView; dimmed?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      style={{
        display: "flex",
        gap: "0.6rem",
        alignItems: "center",
        padding: "0.7rem 0.9rem",
        cursor: "pointer",
        ...(dimmed ? { opacity: 0.6, color: "var(--text-muted)" } : {}),
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <strong>{task.topic_name}</strong>
          <span className="pill pill--stone">{kindLabel(task)}</span>
        </div>
        <p className="pageSub" style={{ margin: 0 }}>
          {crumbText(task)}
        </p>
        <TaskDetailsPanel task={task} open={open} />
      </div>
    </div>
  );
}
