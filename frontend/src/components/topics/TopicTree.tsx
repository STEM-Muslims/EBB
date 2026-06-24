import { useState } from "react";
import type { Topic } from "../../types/topics";
import styles from "./TopicTree.module.css";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

interface Props {
  nodes: Topic[];
  selectedId: number | null;
  onSelect: (topic: Topic) => void;
  onReorder: (parentId: number | null, orderedIds: number[]) => void;
}

export default function TopicTree({
  nodes,
  selectedId,
  onSelect,
  onReorder,
}: Props) {
  return (
    <div className={styles.tree}>
      <Level
        nodes={nodes}
        selectedId={selectedId}
        onSelect={onSelect}
        onReorder={onReorder}
        parentId={null}
        level={0}
      />
    </div>
  );
}

function Level({
  nodes,
  selectedId,
  onSelect,
  onReorder,
  parentId,
  level,
}: any) {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = nodes.findIndex((n: Topic) => n.id === active.id);
    const newIndex = nodes.findIndex((n: Topic) => n.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(nodes, oldIndex, newIndex) as Topic[];
    onReorder(
      parentId,
      reordered.map((n: Topic) => n.id),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={nodes.map((n: Topic) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {nodes.map((node: Topic) => (
            <SortableNode
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={() =>
                setOpenMap((m) => ({ ...m, [node.id]: !m[node.id] }))
              }
              open={openMap[node.id] ?? level === 0}
              level={level}
              onReorder={onReorder}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableNode({
  node,
  selectedId,
  onSelect,
  onToggle,
  open,
  level,
  onReorder,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: level * 16,
  };

  const children = node.children ?? [];

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.node}`}
        onClick={() => onSelect(node)}
      >
        <button {...listeners} {...attributes} className={styles.dragHandle}>
          ⠿
        </button>

        <button
          className={styles.chevron}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <span
            className={styles.chevronIcon}
            style={{
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ▶
          </span>
        </button>

        <span className={styles.nodeName}>{node.name}</span>
      </div>

      {open && children.length > 0 && (
        <div>
          <Level
            nodes={children}
            selectedId={selectedId}
            onSelect={onSelect}
            onReorder={onReorder}
            parentId={node.id}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
}
