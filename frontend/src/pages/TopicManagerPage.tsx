import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { topicsApi } from "../api/topics";
import type { Topic } from "../types/topics";
import TopicAccordion from "../components/topics/TopicAccordion";
import TopicEditor from "../components/topics/TopicEditor";
import TopicCreateForm from "../components/topics/TopicCreateForm";
import PostTaskForm from "../components/topics/PostTaskForm";
import type { ArchivedTopic } from "../types/topics";
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

type PanelMode = "empty" | "selected" | "new-root" | "archived";

export default function TopicManagerPage() {
  const [tree, setTree] = useState<Topic[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const [archived, setArchived] = useState<ArchivedTopic[]>([]);

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

  async function openArchived() {
    setSelectedId(null);
    setPanelMode("archived");
    try {
      setArchived(await topicsApi.getArchived());
    } catch (e) {
      console.error("Failed to load archived topics:", e);
    }
  }

  async function restore(id: number) {
    await topicsApi.restore(id);
    setArchived((prev) => prev.filter((t) => t.id !== id));
    load();
  }

  useEffect(() => {
    load();
  }, []);

  const flat = flattenTree(tree);
  // Re-read the selected node from the freshly loaded tree so it reflects edits.
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
          <span className={styles.treePanelTitle}>Curriculum</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={openArchived}
              title="View archived topics"
            >
              Archived
            </button>
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
        </div>

        <div className={styles.treeScroll}>
          {loading ? (
            <p className={styles.loadingMsg}>Loading…</p>
          ) : (
            <TopicAccordion
              nodes={tree}
              selectedId={selectedId}
              onSelect={handleSelect}
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
              Select an item to edit,
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

            {selected.level_type === "TOPIC" && (
              <>
                <div className={styles.divider} />
                <div className="stack" style={{ gap: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong>Video task</strong>
                    <Link
                      to={`/admin/topics/${selected.id}`}
                      className="btn btn--secondary btn--sm"
                    >
                      Open topic →
                    </Link>
                  </div>
                  <p className="pageSub" style={{ margin: 0 }}>
                    Video status: {selected.video_state.toLowerCase()}
                  </p>
                  <PostTaskForm topic={selected} onPosted={load} />
                </div>
              </>
            )}
          </div>
        )}

        {panelMode === "archived" && (
          <div className={styles.editorContent}>
            <div className={styles.editorHeader}>
              <span className={styles.editorHeading}>Archived topics</span>
            </div>
            {archived.length === 0 ? (
              <p className="pageSub">No archived topics.</p>
            ) : (
              <div className="stack" style={{ gap: "0.5rem" }}>
                {archived.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "center",
                      padding: "0.5rem 0.7rem",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{t.name}</strong>{" "}
                      <span className="pill pill--stone">
                        {t.level_type.toLowerCase()}
                      </span>
                      {t.breadcrumb.length > 0 && (
                        <div className="pageSub">
                          {t.breadcrumb.map((b) => b.name).join(" › ")}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => restore(t.id)}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
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
