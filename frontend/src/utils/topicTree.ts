import type { Topic } from "../types/topics";

/** Flatten a nested topic tree into a single array (depth-first). */
export function flattenTree(nodes: Topic[]): Topic[] {
  const result: Topic[] = [];
  function walk(node: Topic) {
    result.push(node);
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

/**
 * Build the ancestor path for a node, from its root subject down to the node
 * itself, by walking `parent_id` up through a flattened tree.
 */
export function buildBreadcrumb(flat: Topic[], node: Topic): Topic[] {
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
