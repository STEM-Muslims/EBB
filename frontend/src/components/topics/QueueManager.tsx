import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { tasksApi } from "../../api/tasks";
import type { TaskView } from "../../types/topics";

function label(t: TaskView) {
  const crumb = t.breadcrumb.map((b) => b.name).join(" › ");
  const kind =
    t.task_type === "TRANSLATION"
      ? `Translation${t.language ? ` · ${t.language.name}` : ""}`
      : "Recording";
  return { title: t.topic_name ?? `Topic #${t.topic_id}`, crumb, kind };
}

/** Admin view of the to-do queue (drag to reorder) plus the released list. */
export default function QueueManager({
  queue,
  released,
  onChanged,
}: {
  queue: TaskView[];
  released: TaskView[];
  onChanged: () => void;
}) {
  const [items, setItems] = useState<TaskView[]>(queue);
  // Re-sync local order when a fresh queue arrives from the server (adjusting
  // state during render is preferred over an effect for prop-derived state).
  const [prevQueue, setPrevQueue] = useState<TaskView[]>(queue);
  if (queue !== prevQueue) {
    setPrevQueue(queue);
    setItems(queue);
  }
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered); // optimistic
    try {
      await tasksApi.reorderQueue(reordered.map((t) => t.id));
      onChanged();
    } catch {
      setItems(queue); // revert on failure
    }
  }

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.5rem" }}>To-do queue ({items.length})</h3>
        {items.length === 0 ? (
          <p className="pageSub">The queue is empty.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="stack" style={{ gap: "0.4rem" }}>
                {items.map((t, i) => (
                  <SortableRow key={t.id} task={t} position={i + 1} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div>
        <h3 style={{ margin: "0 0 0.5rem" }}>Released ({released.length})</h3>
        {released.length === 0 ? (
          <p className="pageSub">Nothing released.</p>
        ) : (
          <div className="stack" style={{ gap: "0.4rem" }}>
            {released.map((t) => {
              const l = label(t);
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.5rem 0.7rem",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{l.title}</strong>{" "}
                    <span className="pill pill--stone">{l.kind}</span>
                    <div className="pageSub">
                      {l.crumb}
                      {t.assignee_email && ` · released by ${t.assignee_email}`}
                    </div>
                  </div>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={async () => {
                      await tasksApi.requeue(t.id);
                      onChanged();
                    }}
                  >
                    Requeue
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableRow({ task, position }: { task: TaskView; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const l = label(task);
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.5rem 0.7rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface)",
      }}
    >
      <button
        {...listeners}
        {...attributes}
        className="btn btn--ghost btn--sm"
        style={{ cursor: "grab", padding: "0 0.4rem" }}
        title="Drag to reorder"
      >
        ⠿
      </button>
      <span className="pageSub" style={{ width: 22 }}>
        {position}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{l.title}</strong>{" "}
        <span className="pill pill--stone">{l.kind}</span>
        <div className="pageSub">{l.crumb}</div>
      </div>
    </div>
  );
}
