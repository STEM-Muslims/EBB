import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { topicsApi } from "../../api/topics";
import type {
  ArchivedTopic,
  CompletedTopic,
  LevelType,
  Topic,
  VideoState,
} from "../../types/topics";
import { buildBreadcrumb, flattenTree } from "../../utils/topicTree";
import Modal from "../Modal";
import TopicEditor from "./TopicEditor";
import TopicCreateForm from "./TopicCreateForm";
import styles from "./TopicBrowser.module.css";

const LEVEL_LABEL: Record<LevelType, string> = {
  SUBJECT: "Subject",
  MODULE: "Module",
  CHAPTER: "Chapter",
  TOPIC: "Topic",
};

/** The next level down from a container, or null for a leaf. */
const CHILD_LEVEL: Record<LevelType, LevelType | null> = {
  SUBJECT: "MODULE",
  MODULE: "CHAPTER",
  CHAPTER: "TOPIC",
  TOPIC: null,
};

const VIDEO_TAG: Record<VideoState, { label: string; state: VideoState }> = {
  UNASSIGNED: { label: "Not uploaded", state: "UNASSIGNED" },
  ASSIGNED: { label: "In progress", state: "ASSIGNED" },
  COMPLETED: { label: "Video uploaded", state: "COMPLETED" },
};

const activeChildren = (t: Topic | null | undefined) =>
  (t?.children ?? []).filter((c) => c.is_active);

/**
 * A OneDrive-style folder browser for the curriculum tree. The current folder
 * lives in the route (`{base}` for root, `{base}/folder/:folderId` inside), so
 * the breadcrumb, browser Back button, and refresh all reflect the real path.
 * Container nodes open as folder pages; leaf TOPICs link to their detail page.
 */
export default function TopicBrowser({
  admin,
  base,
}: {
  admin: boolean;
  base: string;
}) {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();

  const [tree, setTree] = useState<Topic[]>([]);
  const [completed, setCompleted] = useState<Map<number, CompletedTopic>>(
    new Map(),
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<ArchivedTopic[]>([]);

  const load = useCallback(async () => {
    try {
      const [treeData, completedData] = await Promise.all([
        topicsApi.getTree(),
        topicsApi.getCompleted(),
      ]);
      setTree(treeData);
      setCompleted(new Map(completedData.map((c) => [c.id, c])));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset transient panels when the folder changes.
  useEffect(() => {
    setShowAdd(false);
    setShowEdit(false);
    setShowArchived(false);
  }, [folderId]);

  const flat = flattenTree(tree);
  const current = folderId
    ? (flat.find((t) => t.id === Number(folderId)) ?? null)
    : null;

  // A leaf TOPIC has no folder view — send it to its detail page instead.
  useEffect(() => {
    if (current && current.level_type === "TOPIC") {
      navigate(`${base}/${current.id}`, { replace: true });
    }
  }, [current, base, navigate]);

  if (status === "loading")
    return (
      <div className="loadingState">
        <div className="spinner"></div>
        <span>Loading curriculum…</span>
      </div>
    );
  if (status === "error")
    return <p className="emptyState">Couldn’t load the curriculum.</p>;

  const children = current ? activeChildren(current) : tree.filter((t) => t.is_active);
  const breadcrumb = current ? buildBreadcrumb(flat, current) : [];
  const childLevel: LevelType | null = current
    ? CHILD_LEVEL[current.level_type]
    : "SUBJECT";

  const folderHref = (id: number) => `${base}/folder/${id}`;

  async function openArchived() {
    setShowArchived((v) => !v);
    setShowAdd(false);
    setShowEdit(false);
    if (!showArchived) {
      try {
        setArchived(await topicsApi.getArchived());
      } catch {
        setArchived([]);
      }
    }
  }

  async function restore(id: number) {
    await topicsApi.restore(id);
    setArchived((prev) => prev.filter((t) => t.id !== id));
    load();
  }

  function onArchivedCurrent() {
    // The folder we were in no longer exists — step up to its parent.
    const parent = current?.parent_id;
    navigate(parent ? folderHref(parent) : base);
    load();
  }

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <div className="pageHeadText">
          {/* Breadcrumb path */}
          <nav className={styles.breadcrumb}>
            <Link className={styles.crumb} to={base}>
              Curriculum
            </Link>
            {breadcrumb.map((node, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <span key={node.id} className={styles.crumbGroup}>
                  <span className={styles.crumbSep}>›</span>
                  {isLast ? (
                    <span className={`${styles.crumb} ${styles.crumbCurrent}`}>
                      {node.name || "Unnamed"}
                    </span>
                  ) : (
                    <Link className={styles.crumb} to={folderHref(node.id)}>
                      {node.name || "Unnamed"}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          <h1>{current ? current.name : "Curriculum"}</h1>
          {current?.notes && (
            <p style={{ whiteSpace: "pre-wrap", margin: "0.3rem 0 0" }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginRight: "0.4rem",
                }}
              >
                {LEVEL_LABEL[current.level_type]} notes
              </span>
              {current.notes}
            </p>
          )}
          <p className="pageSub">
            {current
              ? `${LEVEL_LABEL[current.level_type]} · ${children.length} ${
                  children.length === 1 ? "item" : "items"
                }`
              : "Browse the curriculum: subject → module → chapter → topic."}
          </p>
        </div>

        {admin && (
          <div className="pageActions">
            {childLevel && (
              <button
                className="btn btn--sm"
                onClick={() => {
                  setShowAdd(true);
                  setShowEdit(false);
                  setShowArchived(false);
                }}
              >
                + Add {LEVEL_LABEL[childLevel].toLowerCase()}
              </button>
            )}
            {current && (
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setShowEdit(true);
                  setShowAdd(false);
                  setShowArchived(false);
                }}
              >
                Edit
              </button>
            )}
            <button className="btn btn--secondary btn--sm" onClick={openArchived}>
              Archived
            </button>
          </div>
        )}
      </div>

      {/* Admin panels */}
      {admin && showAdd && (
        <Modal
          title={`Add ${LEVEL_LABEL[childLevel ?? "SUBJECT"].toLowerCase()}`}
          onClose={() => setShowAdd(false)}
        >
          {current ? (
            <TopicCreateForm
              parent={current}
              onCreated={() => {
                load();
                setShowAdd(false);
              }}
            />
          ) : (
            <RootSubjectForm
              onCreated={() => {
                load();
                setShowAdd(false);
              }}
            />
          )}
        </Modal>
      )}

      {admin && showEdit && current && (
        <Modal
          title={`Edit ${LEVEL_LABEL[current.level_type].toLowerCase()}`}
          onClose={() => setShowEdit(false)}
        >
          <TopicEditor
            topic={current}
            onUpdated={() => {
              load();
              setShowEdit(false);
            }}
            onArchived={onArchivedCurrent}
          />
        </Modal>
      )}

      {admin && showArchived && (
        <div className="card card--pad-lg" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Archived topics</h3>
          {archived.length === 0 ? (
            <p className="pageSub" style={{ margin: 0 }}>
              No archived topics.
            </p>
          ) : (
            <div className="stack" style={{ gap: "0.5rem" }}>
              {archived.map((t) => (
                <div key={t.id} className={styles.archivedRow}>
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

      {/* Folder contents */}
      {children.length === 0 ? (
        <p className="emptyState">
          {current
            ? "This folder is empty."
            : "No subjects have been added yet."}
        </p>
      ) : (
        <div className={styles.grid}>
          {children.map((child) =>
            child.level_type === "TOPIC" ? (
              <TopicCard
                key={child.id}
                topic={child}
                to={`${base}/${child.id}`}
                translations={completed.get(child.id)?.translated_languages}
                admin={admin}
              />
            ) : (
              <FolderCard
                key={child.id}
                topic={child}
                to={folderHref(child.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ── A container folder (subject / module / chapter) ── */
function FolderCard({ topic, to }: { topic: Topic; to: string }) {
  const count = activeChildren(topic).length;
  return (
    <Link to={to} className={`card ${styles.card}`}>
      <div className={styles.cardTop}>
        <span className={styles.folderIcon} aria-hidden="true">
          ▸
        </span>
        <span className={styles.levelTag} data-level={topic.level_type}>
          {LEVEL_LABEL[topic.level_type]}
        </span>
      </div>
      <h3 className={styles.cardTitle}>{topic.name || "Unnamed"}</h3>
      <p className={styles.cardMeta}>
        {count} {count === 1 ? "item" : "items"}
      </p>
    </Link>
  );
}

/* ── A leaf topic, with video / translation status tags ── */
function TopicCard({
  topic,
  to,
  translations,
  admin,
}: {
  topic: Topic;
  to: string;
  translations: { id: number; name: string }[] | undefined;
  admin: boolean;
}) {
  const tag = VIDEO_TAG[topic.video_state];
  return (
    <Link to={to} className={`card ${styles.card}`}>
      <div className={styles.cardTop}>
        <span className={styles.levelTag} data-level="TOPIC">
          {LEVEL_LABEL.TOPIC}
        </span>
        <span className={styles.videoTag} data-state={tag.state}>
          {tag.label}
        </span>
      </div>
      <h3 className={styles.cardTitle}>{topic.name || "Unnamed"}</h3>
      <div className={styles.tagRow}>
        <span className={styles.tagLabel}>Translated to:</span>
        {translations && translations.length > 0 ? (
          translations.map((lang) => (
            <span key={lang.id} className="pill pill--stone">
              {lang.name}
            </span>
          ))
        ) : (
          <span className={styles.tagMuted}>—</span>
        )}
      </div>
      {admin && topic.video_state === "COMPLETED" && (
        <p className={styles.cardMeta}>
          YouTube: {topic.youtube_privacy_status ?? "unknown"}
        </p>
      )}
    </Link>
  );
}

/* ── Root-level "add subject" form ── */
function RootSubjectForm({ onCreated }: { onCreated: () => void }) {
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
    setError(null);
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
    <div className="stack" style={{ gap: "0.75rem" }}>
      <h3 style={{ margin: 0 }}>New subject</h3>
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
      <textarea
        className={styles.input}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes…"
        rows={2}
      />
      {error && (
        <p className="pageSub" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      <div>
        <button className="btn btn--sm" onClick={create} disabled={loading}>
          {loading ? "Creating…" : "Create subject"}
        </button>
      </div>
    </div>
  );
}
