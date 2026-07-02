import { useState, type ReactNode } from "react";
import type { LevelType, Topic, VideoState } from "../../types/topics";
import styles from "./TopicAccordion.module.css";

const LEVEL_LABEL: Record<LevelType, string> = {
  SUBJECT: "Subject",
  MODULE: "Module",
  CHAPTER: "Chapter",
  TOPIC: "Topic",
};

const VIDEO_STATE_LABEL: Record<VideoState, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  COMPLETED: "Completed",
};

interface Props {
  nodes: Topic[];
  /** Currently highlighted node (e.g. the one being edited). */
  selectedId?: number | null;
  /** Called when a node's label is clicked. */
  onSelect?: (topic: Topic) => void;
  /** Optional admin controls rendered on the right of each row. */
  renderActions?: (topic: Topic) => ReactNode;
  /** Levels expanded by default (others start collapsed). */
  defaultExpandedLevels?: LevelType[];
}

export default function TopicAccordion({
  nodes,
  selectedId = null,
  onSelect,
  renderActions,
  defaultExpandedLevels = ["SUBJECT"],
}: Props) {
  const active = nodes.filter((n) => n.is_active);
  if (active.length === 0) {
    return <p className={styles.empty}>Nothing here yet.</p>;
  }
  return (
    <ul className={styles.tree}>
      {active.map((node) => (
        <AccordionNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          renderActions={renderActions}
          defaultExpandedLevels={defaultExpandedLevels}
        />
      ))}
    </ul>
  );
}

function AccordionNode({
  node,
  depth,
  selectedId,
  onSelect,
  renderActions,
  defaultExpandedLevels,
}: {
  node: Topic;
  depth: number;
  selectedId: number | null;
  onSelect?: (topic: Topic) => void;
  renderActions?: (topic: Topic) => ReactNode;
  defaultExpandedLevels: LevelType[];
}) {
  const children = (node.children ?? []).filter((c) => c.is_active);
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(
    defaultExpandedLevels.includes(node.level_type),
  );

  return (
    <li className={styles.item}>
      <div
        className={`${styles.row} ${selectedId === node.id ? styles.selected : ""}`}
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        <button
          type="button"
          className={styles.chevron}
          onClick={() => hasChildren && setOpen((o) => !o)}
          aria-hidden={!hasChildren}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          <span style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
            ▶
          </span>
        </button>

        <button
          type="button"
          className={styles.label}
          onClick={() => onSelect?.(node)}
          title={LEVEL_LABEL[node.level_type]}
        >
          <span className={styles.levelTag} data-level={node.level_type}>
            {LEVEL_LABEL[node.level_type]}
          </span>
          <span className={styles.name}>{node.name || <em>Unnamed</em>}</span>
          {node.level_type === "TOPIC" && (
            <span
              className={styles.videoState}
              data-state={node.video_state}
            >
              {VIDEO_STATE_LABEL[node.video_state]}
            </span>
          )}
        </button>

        {renderActions && (
          <span className={styles.actions}>{renderActions(node)}</span>
        )}
      </div>

      {hasChildren && open && (
        <ul className={styles.subtree}>
          {children.map((child) => (
            <AccordionNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              renderActions={renderActions}
              defaultExpandedLevels={defaultExpandedLevels}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
