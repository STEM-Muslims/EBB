import { useState } from "react";
import type { Topic } from "../../types/topics";
import styles from "./TopicTree.module.css";

interface Props {
  nodes: Topic[];
  selectedId: number | null;
  onSelect: (topic: Topic) => void;
  onRefresh: () => void;
}

const LEVEL_BADGE: Record<string, string> = {
  SUBJECT: "S",
  TOPIC: "T",
  VIDEO: "V",
};

export default function TopicTree({ nodes, selectedId, onSelect }: Props) {
  return (
    <div className={styles.tree}>
      {nodes.length === 0 ? (
        <p className={styles.empty}>No subjects yet.</p>
      ) : (
        nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={onSelect}
            level={0}
          />
        ))
      )}
    </div>
  );
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  level,
}: {
  node: Topic;
  selectedId: number | null;
  onSelect: (t: Topic) => void;
  level: number;
}) {
  const [open, setOpen] = useState(level === 0);
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div className={styles.nodeWrapper} style={{ paddingLeft: level * 16 }}>
      <div
        className={`${styles.node} ${isSelected ? styles.nodeSelected : ""}`}
        onClick={() => onSelect(node)}
      >
        <button
          className={styles.chevron}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setOpen((o) => !o);
          }}
          aria-label={open ? "Collapse" : "Expand"}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          <span
            className={styles.chevronIcon}
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
        </button>

        <span
          className={`${styles.badge} ${styles[`badge${node.level_type}`]}`}
        >
          {LEVEL_BADGE[node.level_type] ?? "?"}
        </span>

        <span className={styles.nodeName}>
          {node.name || <em className={styles.unnamed}>Unnamed</em>}
        </span>
      </div>

      {open && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
