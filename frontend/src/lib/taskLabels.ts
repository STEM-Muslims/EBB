import type { TaskView } from "../types/topics";

/** "Maths › Calculus › Differentiation" — a task's place in the curriculum. */
export function crumbText(t: TaskView): string {
  return t.breadcrumb.map((b) => b.name).join(" › ");
}

/** "Recording" / "Translation · French" */
export function kindLabel(t: TaskView): string {
  return t.task_type === "TRANSLATION"
    ? `Translation${t.language ? ` · ${t.language.name}` : ""}`
    : "Recording";
}
