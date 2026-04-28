import type { DocumentationNode } from "../types";

export type BacklogSort = "backlog" | "title" | "epic" | "status";

export type TaskStatus = "todo" | "in_progress" | "done";

export function taskStatusLabel(status: TaskStatus) {
  return status === "in_progress" ? "In progress" : status === "done" ? "Done" : "To do";
}

export function formatSprintDate(value: string | null) {
  if (!value) return "In progress";
  return new Date(value.replace(" ", "T")).toLocaleDateString();
}

export function formatShortDate(value: string | null) {
  if (!value) return "No date";
  return new Date(value.replace(" ", "T")).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function findDocumentationNode(
  nodes: DocumentationNode[],
  nodeId: string | null,
): DocumentationNode | null {
  if (!nodeId) return null;
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const nested = findDocumentationNode(node.children, nodeId);
    if (nested) return nested;
  }
  return null;
}

export function findFirstPageNode(nodes: DocumentationNode[]): DocumentationNode | null {
  for (const node of nodes) {
    if (node.kind === "page") return node;
    const nested = findFirstPageNode(node.children);
    if (nested) return nested;
  }
  return null;
}

export function countDocumentationNodes(nodes: DocumentationNode[]): number {
  return nodes.reduce(
    (count, node) => count + 1 + (node.kind === "directory" ? countDocumentationNodes(node.children) : 0),
    0,
  );
}

export type TaskRecord = {
  epic: { id: string; title: string; position: number };
  task: {
    id: string;
    epicId: string;
    title: string;
    description: string;
    position: number;
    status: TaskStatus;
    sprintId: string | null;
    claimedBy: string | null;
    createdAt: string;
  };
};

export function sortBacklogTaskRows(rows: TaskRecord[], sort: BacklogSort) {
  const taskStatusOrder: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2 };
  return [...rows].sort((left, right) => {
    if (sort === "title")
      return left.task.title.localeCompare(right.task.title) || left.epic.title.localeCompare(right.epic.title);
    if (sort === "epic")
      return left.epic.title.localeCompare(right.epic.title) || left.task.position - right.task.position;
    if (sort === "status") {
      const diff = taskStatusOrder[left.task.status] - taskStatusOrder[right.task.status];
      if (diff !== 0) return diff;
      return left.epic.title.localeCompare(right.epic.title) || left.task.position - right.task.position;
    }
    return (
      left.epic.position - right.epic.position ||
      left.task.position - right.task.position ||
      left.task.createdAt.localeCompare(right.task.createdAt)
    );
  });
}
