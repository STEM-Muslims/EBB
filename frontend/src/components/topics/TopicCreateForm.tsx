import { useState } from "react";
import { topicsApi } from "../../api/topics";
import type { LevelType, Topic } from "../../types/topics";
import styles from "./TopicCreateForm.module.css";

const CHILD_LEVEL: Record<LevelType, LevelType> = {
  SUBJECT: "TOPIC",
  TOPIC: "VIDEO",
  VIDEO: "VIDEO",
};

export default function TopicCreateForm({
  parent,
  onCreated,
}: {
  parent: Topic;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const childLevel = CHILD_LEVEL[parent.level_type];
  const canAdd = parent.level_type !== "VIDEO";

  async function create() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await topicsApi.create({
        name: name.trim(),
        notes: notes.trim() || null,
        parent_id: parent.id,
        level_type: childLevel,
        sort_order: 0,
      });
      setName("");
      setNotes("");
      onCreated();
    } catch {
      setError("Failed to create. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!canAdd) {
    return (
      <div className={styles.blocked}>
        <p>Video nodes cannot have children.</p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <span className={styles.formTitle}>Add child</span>
        <span className={`${styles.badge} ${styles[`badge${childLevel}`]}`}>
          {childLevel}
        </span>
      </div>

      <div className={styles.field}>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder={`${childLevel.charAt(0) + childLevel.slice(1).toLowerCase()} name`}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
      </div>

      <div className={styles.field}>
        <textarea
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.btn} onClick={create} disabled={loading}>
        {loading ? "Adding…" : `+ Add ${childLevel.toLowerCase()}`}
      </button>
    </div>
  );
}
