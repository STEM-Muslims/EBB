import type { Breadcrumb, TaskView } from "../types/topics";

function requestedAt(t: TaskView): number {
  const ms = Date.parse(t.requested_at);
  return Number.isNaN(ms) ? 0 : ms;
}

function byNewest(a: TaskView, b: TaskView): number {
  return requestedAt(b) - requestedAt(a) || b.id - a.id;
}

/** Tasks bucketed by their SUBJECT ancestor — newest first within each bucket,
 * subjects A→Z, and anything with no SUBJECT ancestor in a trailing bucket. */
export function groupBySubject(
  tasks: TaskView[],
): { subject: Breadcrumb | null; tasks: TaskView[] }[] {
  const bySubject = new Map<number, { subject: Breadcrumb; tasks: TaskView[] }>();
  const unfiled: TaskView[] = [];

  for (const t of tasks) {
    const subject = t.breadcrumb.find((b) => b.level_type === "SUBJECT");
    if (!subject) {
      unfiled.push(t);
      continue;
    }
    const group = bySubject.get(subject.id);
    if (group) group.tasks.push(t);
    else bySubject.set(subject.id, { subject, tasks: [t] });
  }

  const filed = [...bySubject.values()].sort((a, b) =>
    a.subject.name.localeCompare(b.subject.name, undefined, {
      sensitivity: "base",
    }),
  );
  for (const g of filed) g.tasks.sort(byNewest);

  const groups: { subject: Breadcrumb | null; tasks: TaskView[] }[] = [...filed];
  if (unfiled.length > 0) {
    groups.push({ subject: null, tasks: unfiled.sort(byNewest) });
  }
  return groups;
}
