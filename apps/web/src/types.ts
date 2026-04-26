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

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  epicId: string;
  title: string;
  description: string;
  position: number;
  status: TaskStatus;
  createdAt: string;
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
  epics: Epic[];
};
