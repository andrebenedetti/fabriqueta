export type Project = {
  slug: string;
  name: string;
  createdAt: string;
  epicCount: number;
  taskCount: number;
};

export type ProjectDetails = {
  slug: string;
  name: string;
  createdAt: string;
};

export type Sprint = {
  id: string;
  name: string;
  status: "active" | "completed";
  retrospectiveNotes: string;
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
};

export type SprintHistoryEntry = Sprint & {
  totalTasks: number;
  completedTasks: number;
};

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  epicId: string;
  title: string;
  description: string;
  position: number;
  status: TaskStatus;
  sprintId: string | null;
  createdAt: string;
};

export type SprintTask = Task & {
  epicTitle: string;
};

export type Epic = {
  id: string;
  title: string;
  description: string;
  position: number;
  createdAt: string;
  tasks: Task[];
};

export type Board = {
  project: ProjectDetails;
  activeSprint: Sprint | null;
  sprintHistory: SprintHistoryEntry[];
  sprintTasks: SprintTask[];
  epics: Epic[];
};

export type DocumentationNodeKind = "directory" | "page";

export type DocumentationNode = {
  id: string;
  parentId: string | null;
  name: string;
  kind: DocumentationNodeKind;
  position: number;
  content: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  children: DocumentationNode[];
};

export type Documentation = {
  project: ProjectDetails;
  nodes: DocumentationNode[];
};
