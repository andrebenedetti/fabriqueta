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
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
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
  sprintTasks: SprintTask[];
  epics: Epic[];
};
