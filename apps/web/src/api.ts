import type { Board, Documentation, Project } from "./types";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchProjects() {
  return request<{ projects: Project[] }>("/api/projects");
}

export async function createProject(name: string) {
  return request<{ project: Project }>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function fetchBoard(projectSlug: string) {
  return request<Board>(`/api/projects/${projectSlug}/board`);
}

export async function fetchDocumentation(projectSlug: string) {
  return request<Documentation>(`/api/projects/${projectSlug}/documentation`);
}

export async function createEpic(projectSlug: string, title: string, description = "") {
  return request(`/api/projects/${projectSlug}/epics`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export async function updateEpic(
  projectSlug: string,
  epicId: string,
  input: { title: string; description?: string },
) {
  return request(`/api/projects/${projectSlug}/epics/${epicId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteEpic(projectSlug: string, epicId: string) {
  return request(`/api/projects/${projectSlug}/epics/${epicId}`, {
    method: "DELETE",
  });
}

export async function moveEpic(projectSlug: string, epicId: string, direction: "up" | "down") {
  return request(`/api/projects/${projectSlug}/epics/${epicId}/move`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
}

export async function createTask(
  projectSlug: string,
  epicId: string,
  title: string,
  description = "",
) {
  return request(`/api/projects/${projectSlug}/epics/${epicId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export async function moveTask(projectSlug: string, taskId: string, direction: "up" | "down") {
  return request(`/api/projects/${projectSlug}/tasks/${taskId}/move`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
}

export async function updateTask(
  projectSlug: string,
  taskId: string,
  input: { title: string; description?: string; status?: "todo" | "in_progress" | "done" },
) {
  return request(`/api/projects/${projectSlug}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTask(projectSlug: string, taskId: string) {
  return request(`/api/projects/${projectSlug}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function updateTaskStatus(
  projectSlug: string,
  taskId: string,
  input: { title: string; description?: string; status: "todo" | "in_progress" | "done" },
) {
  return updateTask(projectSlug, taskId, input);
}

export async function startSprint(projectSlug: string, name: string) {
  return request(`/api/projects/${projectSlug}/sprints`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function completeActiveSprint(projectSlug: string) {
  return request(`/api/projects/${projectSlug}/sprints/complete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function updateSprintRetrospectiveNotes(
  projectSlug: string,
  sprintId: string,
  retrospectiveNotes: string,
) {
  return request(`/api/projects/${projectSlug}/sprints/${sprintId}`, {
    method: "PATCH",
    body: JSON.stringify({ retrospectiveNotes }),
  });
}

export async function addTaskToSprint(projectSlug: string, taskId: string) {
  return request(`/api/projects/${projectSlug}/tasks/${taskId}/sprint`, {
    method: "POST",
    body: JSON.stringify({ action: "add" }),
  });
}

export async function removeTaskFromSprint(projectSlug: string, taskId: string) {
  return request(`/api/projects/${projectSlug}/tasks/${taskId}/sprint`, {
    method: "POST",
    body: JSON.stringify({ action: "remove" }),
  });
}

export async function createDocumentationNode(
  projectSlug: string,
  input: {
    kind: "directory" | "page";
    parentId?: string | null;
    name: string;
    content?: string;
  },
) {
  return request(`/api/projects/${projectSlug}/documentation/nodes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateDocumentationNode(
  projectSlug: string,
  nodeId: string,
  input: {
    name?: string;
    content?: string;
  },
) {
  return request(`/api/projects/${projectSlug}/documentation/nodes/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteDocumentationNode(projectSlug: string, nodeId: string) {
  return request(`/api/projects/${projectSlug}/documentation/nodes/${nodeId}`, {
    method: "DELETE",
  });
}
