import { useEffect, useState } from "react";
import { topicsApi } from "../api/topics";
import type { Topic } from "../types/topics";
import TopicTree from "../components/topics/TopicTree";
import TopicEditor from "../components/topics/TopicEditor";
import TopicCreateForm from "../components/topics/TopicCreateForm";
import styles from "./TopicManagerPage.module.css";

function flattenTree(nodes: Topic[]): Topic[] {
  const result: Topic[] = [];
  function walk(node: Topic) {
    result.push(node);
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

function buildBreadcrumb(flat: Topic[], node: Topic): Topic[] {
  const path: Topic[] = [node];
  let current = node;
  while (current.parent_id !== null) {
    const parent = flat.find((t) => t.id === current.parent_id);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }
  return path;
}

type PanelMode = "empty" | "selected" | "new-root";

export default function TopicManagerPage() {
  const [tree, setTree] = useState<Topic[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");

  async function load() {
    setLoading(true);
    try {
      const data = await topicsApi.getTree();
      setTree(data);
    } catch (e) {
      console.error("Failed to load tree:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const flat = flattenTree(tree);
  const selected = selectedId
    ? (flat.find((t) => t.id === selectedId) ?? null)
    : null;
  const breadcrumb = selected ? buildBreadcrumb(flat, selected) : [];

  function handleSelect(node: Topic) {
    setSelectedId(node.id);
    setPanelMode("selected");
  }

  function handleArchived() {
    setSelectedId(null);
    setPanelMode("empty");
    load();
  }

  return (
    <div className={styles.page}>
      {/* ── LEFT PANEL: TREE ─────────────────── */}
      <aside className={styles.treePanel}>
        <div className={styles.treePanelHeader}>
          <span className={styles.treePanelTitle}>Topics</span>
          <button
            className={styles.newRootBtn}
            onClick={() => {
              setSelectedId(null);
              setPanelMode("new-root");
            }}
            title="Add subject"
          >
            +
          </button>
        </div>

        <div className={styles.treeScroll}>
          {loading ? (
            <p className={styles.loadingMsg}>Loading…</p>
          ) : (
            <TopicTree
              nodes={tree}
              selectedId={selectedId}
              onSelect={handleSelect}
              onReorder={handleReorder}
            />
          )}
        </div>
      </aside>

      {/* ── RIGHT PANEL: EDITOR ──────────────── */}
      <section className={styles.editorPanel}>
        {panelMode === "empty" && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◈</span>
            <p>
              Select a topic to edit,
              <br />
              or add a new subject.
            </p>
          </div>
        )}

        {panelMode === "new-root" && (
          <div className={styles.editorContent}>
            <div className={styles.editorHeader}>
              <span className={styles.editorHeading}>New subject</span>
            </div>
            <NewSubjectForm
              onCreated={() => {
                load();
                setPanelMode("empty");
              }}
              onCancel={() => setPanelMode("empty")}
            />
          </div>
        )}

        {panelMode === "selected" && selected && (
          <div className={styles.editorContent}>
            <div className={styles.editorHeader}>
              <Breadcrumb nodes={breadcrumb} onSelect={handleSelect} />
            </div>
            <TopicEditor
              topic={selected}
              onUpdated={load}
              onArchived={handleArchived}
            />
            <div className={styles.divider} />
            <TopicCreateForm parent={selected} onCreated={load} />
          </div>
        )}
      </section>
    </div>
  );

  async function handleReorder(parentId: number | null, orderedIds: number[]) {
    try {
      await topicsApi.reorder(parentId, orderedIds);
      await load();
    } catch (e) {
      console.error("Failed to reorder", e);
    }
  }
}

/* ── Breadcrumb ─────────────────────────── */
function Breadcrumb({
  nodes,
  onSelect,
}: {
  nodes: Topic[];
  onSelect: (t: Topic) => void;
}) {
  return (
    <nav className={styles.breadcrumb}>
      {nodes.map((node, i) => (
        <span key={node.id} className={styles.breadcrumbItem}>
          {i > 0 && <span className={styles.breadcrumbSep}>›</span>}
          <button
            className={`${styles.breadcrumbBtn} ${
              i === nodes.length - 1 ? styles.breadcrumbCurrent : ""
            }`}
            onClick={() => onSelect(node)}
          >
            {node.name || <em>Unnamed</em>}
          </button>
        </span>
      ))}
    </nav>
  );
}

/* ── New root subject form ──────────────── */
function NewSubjectForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    try {
      await topicsApi.create({
        name: name.trim(),
        notes: notes.trim() || null,
        parent_id: null,
        level_type: "SUBJECT",
        sort_order: 0,
      });
      onCreated();
    } catch {
      setError("Failed to create.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.newSubjectForm}>
      <div className={styles.field}>
        <label className={styles.label}>Subject name</label>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Mathematics"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes…"
          rows={3}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formActions}>
        <button
          className={styles.btnPrimary}
          onClick={create}
          disabled={loading}
        >
          {loading ? "Creating…" : "Create subject"}
        </button>
        <button className={styles.btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
