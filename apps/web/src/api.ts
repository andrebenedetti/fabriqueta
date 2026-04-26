import type { Board, Project } from "./types";

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

export async function createEpic(projectSlug: string, title: string, description = "") {
  return request(`/api/projects/${projectSlug}/epics`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
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
