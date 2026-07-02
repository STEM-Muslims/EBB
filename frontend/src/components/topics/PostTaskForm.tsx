import { useEffect, useState } from "react";
import { tasksApi } from "../../api/tasks";
import { languagesApi, type Language } from "../../api/languages";
import type { TaskType, Topic } from "../../types/topics";

/** Admin form to post a task to the queue. No assignee — eligible users pick it
 * up themselves via the queue. */
export default function PostTaskForm({
  topic,
  onPosted,
}: {
  topic: Topic;
  onPosted: () => void;
}) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const videoReady = topic.video_state === "COMPLETED";

  const [taskType, setTaskType] = useState<TaskType>("RECORDING");
  const [languageId, setLanguageId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    languagesApi.getAll().then(setLanguages).catch(() => {});
  }, []);

  async function submit() {
    setError(null);
    setDone(null);
    if (taskType === "TRANSLATION" && languageId === "") {
      setError("Pick a language.");
      return;
    }
    setBusy(true);
    try {
      await tasksApi.post({
        topic_id: topic.id,
        task_type: taskType,
        language_id: taskType === "TRANSLATION" ? Number(languageId) : undefined,
      });
      setDone("Task posted to the queue.");
      setLanguageId("");
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      <div className="field">
        <label className="label">Task type</label>
        <select
          className="select"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as TaskType)}
        >
          <option value="RECORDING">Recording (a teacher records the video)</option>
          <option value="TRANSLATION" disabled={!videoReady}>
            Translation (caption the video){!videoReady ? " — needs a video first" : ""}
          </option>
        </select>
      </div>

      {taskType === "TRANSLATION" && (
        <div className="field">
          <label className="label">Language</label>
          <select
            className="select"
            value={languageId}
            onChange={(e) =>
              setLanguageId(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">Select a language…</option>
            {languages
              .filter((l) => l.is_active)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {error && <p style={{ color: "var(--danger, #b00)" }}>{error}</p>}
      {done && <p style={{ color: "var(--brand-darker)" }}>{done}</p>}

      <button className="btn btn--sm" onClick={submit} disabled={busy}>
        {busy ? "Posting…" : "Post to queue"}
      </button>
    </div>
  );
}
