import { useEffect, useState } from "react";
import { topicsApi } from "../../api/topics";
import type { Topic } from "../../types/topics";
import styles from "./user.module.css";

function TopicNode({ topic }: { topic: Topic }) {
  const children = (topic.children ?? []).filter((c) => c.is_active);
  return (
    <li>
      <div className={styles.node}>
        <span className={styles.levelTag} data-level={topic.level_type}>
          {topic.level_type}
        </span>
        <span className={styles.nodeName}>{topic.name}</span>
      </div>
      {children.length > 0 && (
        <ul className={styles.subtree}>
          {children.map((c) => (
            <TopicNode key={c.id} topic={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function UserTopicsPage() {
  const [tree, setTree] = useState<Topic[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    topicsApi
      .getTree()
      .then((data) => {
        setTree(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Curriculum</span>
          <h1>Subjects &amp; topics</h1>
          <p className="pageSub">
            The curriculum, organised by subject and topic.
          </p>
        </div>
      </div>

      {status === "loading" && <p className="emptyState">Loading curriculum…</p>}
      {status === "error" && (
        <p className="emptyState">Couldn’t load topics. Please try again later.</p>
      )}
      {status === "ready" && tree.length === 0 && (
        <p className="emptyState">No subjects have been added yet.</p>
      )}

      {status === "ready" && tree.length > 0 && (
        <div className="card">
          <ul className={styles.tree}>
            {tree
              .filter((t) => t.is_active)
              .map((t) => (
                <TopicNode key={t.id} topic={t} />
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
