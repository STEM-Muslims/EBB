import { useEffect, useState } from "react";
import { topicsApi } from "../../api/topics";
import type { Topic } from "../../types/topics";
import styles from "./TopicEditor.module.css";

export default function TopicEditor({
  topic,
  onUpdated,
  onArchived,
}: {
  topic: Topic;
  onUpdated: () => void;
  onArchived: () => void;
}) {
  const [name, setName] = useState(topic.name);
  const [notes, setNotes] = useState(topic.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(topic.name);
    setNotes(topic.notes ?? "");
    setConfirmArchive(false);
    setError(null);
  }, [topic.id]);

  const dirty = name !== topic.name || notes !== (topic.notes ?? "");

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await topicsApi.update(topic.id, { name: name.trim(), notes });
      onUpdated();
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    try {
      await topicsApi.archive(topic.id);
      onArchived();
    } catch {
      setError("Failed to archive.");
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span
            className={`${styles.badge} ${styles[`badge${topic.level_type}`]}`}
          >
            {topic.level_type}
          </span>
          <span className={styles.idTag}>#{topic.id}</span>
        </div>
        {dirty && <span className={styles.unsaved}>Unsaved changes</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Topic name"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes…"
          rows={4}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          className={styles.btnPrimary}
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {!confirmArchive ? (
          <button
            className={styles.btnDanger}
            onClick={() => setConfirmArchive(true)}
          >
            Archive
          </button>
        ) : (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>Sure?</span>
            <button className={styles.btnDangerConfirm} onClick={archive}>
              Yes, archive
            </button>
            <button
              className={styles.btnGhost}
              onClick={() => setConfirmArchive(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
