import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { topicsApi } from "../../api/topics";
import type { Topic } from "../../types/topics";
import TopicAccordion from "../../components/topics/TopicAccordion";

export default function UserTopicsPage() {
  const [tree, setTree] = useState<Topic[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const navigate = useNavigate();

  useEffect(() => {
    topicsApi
      .getTree()
      .then((data) => {
        setTree(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  function handleSelect(topic: Topic) {
    // Only leaf topics have a detail/video page.
    if (topic.level_type === "TOPIC") navigate(`/topics/${topic.id}`);
  }

  return (
    <div className="pageWrap">
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Curriculum</span>
          <h1>Subjects &amp; topics</h1>
          <p className="pageSub">
            Browse the curriculum: subject → module → chapter → topic. Open a
            topic to see its video.
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
        <div className="card card--pad-lg">
          <TopicAccordion nodes={tree} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}
