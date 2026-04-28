import {
  addTaskToActiveSprint,
  checkProjectHealth,
  claimTask,
  completeActiveSprint,
  createDocumentationNode,
  createEpic,
  createProject,
  createTask,
  deleteEpic,
  deleteDocumentationNode,
  deleteTask,
  exportDocumentationToFilesystem,
  findDocumentationNodeByPath,
  getActivityLog,
  getCompactProjectSummary,
  getProjectBoard,
  getProjectDocumentation,
  importDocumentationFromFilesystem,
  listProjects,
  logActivity,
  moveEpic,
  moveTask,
  releaseTask,
  removeTaskFromSprint,
  searchDocumentation,
  startSprint,
  type DocumentationNode,
  type DocumentationNodeKind,
  type TaskStatus,
  updateDocumentationNode,
  updateEpic,
  updateSprintRetrospectiveNotes,
  updateTask,
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
  deleteSnapshot,
} from "./db";

type Direction = "up" | "down";

type JsonBody = Record<string, unknown>;

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function empty(status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders(),
  });
}

function parseBody<T extends JsonBody>(request: Request) {
  return request.json() as Promise<T>;
}

function getDirection(value: unknown): Direction {
  if (value === "up" || value === "down") {
    return value;
  }

  throw new Error("Direction must be 'up' or 'down'");
}

function getStatus(value: unknown): TaskStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "todo" || value === "in_progress" || value === "done") {
    return value;
  }

  throw new Error("Invalid task status");
}

function getDocumentationKind(value: unknown): DocumentationNodeKind {
  if (value === "directory" || value === "page") {
    return value;
  }

  throw new Error("Documentation kind must be 'directory' or 'page'");
}

function getParentId(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function pathParts(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

export async function handleRequest(request: Request) {
  const url = new URL(request.url);
  const parts = pathParts(url.pathname);

  if (request.method === "OPTIONS") {
    return empty();
  }

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    if (request.method === "GET" && url.pathname === "/api/projects") {
      return json({ projects: listProjects() });
    }

    if (request.method === "POST" && url.pathname === "/api/projects") {
      const body = await parseBody<{ name?: unknown }>(request);
      return json({ project: createProject(String(body.name ?? "")) }, 201);
    }

    if (
      request.method === "GET" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "board" &&
      parts.length === 4
    ) {
      return json(getProjectBoard(parts[2]));
    }

    if (
      request.method === "GET" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "documentation" &&
      parts.length === 4
    ) {
      const query = url.searchParams.get("q");
      if (query) {
        const limit = url.searchParams.get("limit")
          ? Number(url.searchParams.get("limit"))
          : undefined;
        return json({ query, results: searchDocumentation(parts[2], query, { limit }) });
      }

      return json(getProjectDocumentation(parts[2]));
    }

    if (
      request.method === "GET" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "activity" &&
      parts.length === 4
    ) {
      const limit = url.searchParams.get("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined;
      const offset = url.searchParams.get("offset")
        ? Number(url.searchParams.get("offset"))
        : undefined;
      return json({ activities: getActivityLog(parts[2], { limit, offset }) });
    }

    if (
      request.method === "DELETE" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "epics" &&
      parts.length === 5
    ) {
      return json({ epicId: deleteEpic(parts[2], parts[4]) });
    }

    if (
      request.method === "PATCH" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "sprints" &&
      parts.length === 5
    ) {
      const body = await parseBody<{ retrospectiveNotes?: unknown }>(request);
      return json({
        sprint: updateSprintRetrospectiveNotes(
          parts[2],
          parts[4],
          String(body.retrospectiveNotes ?? ""),
        ),
      });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "sprints" &&
      parts.length === 4
    ) {
      const body = await parseBody<{ name?: unknown }>(request);
      return json({ sprint: startSprint(parts[2], { name: String(body.name ?? "") }) }, 201);
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "sprints" &&
      parts[4] === "complete" &&
      parts.length === 5
    ) {
      completeActiveSprint(parts[2]);
      return json({ ok: true });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "epics" &&
      parts.length === 4
    ) {
      const body = await parseBody<{ title?: unknown; description?: unknown }>(request);
      return json(
        {
          epic: createEpic(parts[2], {
            title: String(body.title ?? ""),
            description: body.description ? String(body.description) : "",
          }),
        },
        201,
      );
    }

    if (
      request.method === "DELETE" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "tasks" &&
      parts.length === 5
    ) {
      return json({ taskId: deleteTask(parts[2], parts[4]) });
    }

    if (
      request.method === "PATCH" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "epics" &&
      parts.length === 5
    ) {
      const body = await parseBody<{ title?: unknown; description?: unknown }>(request);
      return json({
        epic: updateEpic(parts[2], parts[4], {
          title: String(body.title ?? ""),
          description: body.description ? String(body.description) : "",
        }),
      });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "epics" &&
      parts[5] === "move" &&
      parts.length === 6
    ) {
      const body = await parseBody<{ direction?: unknown }>(request);
      return json({ epic: moveEpic(parts[2], parts[4], getDirection(body.direction)) });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "epics" &&
      parts[5] === "tasks" &&
      parts.length === 6
    ) {
      const body = await parseBody<{ title?: unknown; description?: unknown }>(request);
      return json(
        {
          task: createTask(parts[2], parts[4], {
            title: String(body.title ?? ""),
            description: body.description ? String(body.description) : "",
          }),
        },
        201,
      );
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "tasks" &&
      parts[5] === "sprint" &&
      parts.length === 6
    ) {
      const body = await parseBody<{ action?: unknown }>(request);

      if (body.action === "add") {
        return json({ task: addTaskToActiveSprint(parts[2], parts[4]) });
      }

      if (body.action === "remove") {
        return json({ task: removeTaskFromSprint(parts[2], parts[4]) });
      }

      throw new Error("Sprint action must be 'add' or 'remove'");
    }

    if (
      request.method === "PATCH" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "tasks" &&
      parts.length === 5
    ) {
      const body = await parseBody<{ title?: unknown; description?: unknown; status?: unknown }>(
        request,
      );

      return json({
        task: updateTask(parts[2], parts[4], {
          title: String(body.title ?? ""),
          description: body.description ? String(body.description) : "",
          status: getStatus(body.status),
        }),
      });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "tasks" &&
      parts[5] === "claim" &&
      parts.length === 6
    ) {
      const body = await parseBody<{ claimedBy?: unknown }>(request);
      return json({
        task: claimTask(parts[2], parts[4], String(body.claimedBy ?? "")),
      });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "tasks" &&
      parts[5] === "release" &&
      parts.length === 6
    ) {
      return json({ task: releaseTask(parts[2], parts[4]) });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "tasks" &&
      parts[5] === "move" &&
      parts.length === 6
    ) {
      const body = await parseBody<{ direction?: unknown }>(request);
      return json({ task: moveTask(parts[2], parts[4], getDirection(body.direction)) });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "documentation" &&
      parts[4] === "nodes" &&
      parts.length === 5
    ) {
      const body = await parseBody<{
        kind?: unknown;
        parentId?: unknown;
        name?: unknown;
        content?: unknown;
      }>(request);

      return json(
        {
          node: createDocumentationNode(parts[2], {
            kind: getDocumentationKind(body.kind),
            parentId: getParentId(body.parentId),
            name: String(body.name ?? ""),
            content: body.content === undefined ? undefined : String(body.content),
          }),
        },
        201,
      );
    }

    if (
      request.method === "PATCH" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "documentation" &&
      parts[4] === "nodes" &&
      parts.length === 6
    ) {
      const body = await parseBody<{ name?: unknown; content?: unknown }>(request);

      return json({
        node: updateDocumentationNode(parts[2], parts[5], {
          name: body.name === undefined ? undefined : String(body.name),
          content: body.content === undefined ? undefined : String(body.content),
        }),
      });
    }

    if (
      request.method === "DELETE" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "documentation" &&
      parts[4] === "nodes" &&
      parts.length === 6
    ) {
      return json({ nodeId: deleteDocumentationNode(parts[2], parts[5]) });
    }

    if (
      request.method === "GET" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "snapshots" &&
      parts.length === 4
    ) {
      return json({ snapshots: listSnapshots(parts[2]) });
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "snapshots" &&
      parts.length === 4
    ) {
      const body = await parseBody<{ label?: unknown }>(request);
      return json({ snapshot: createSnapshot(parts[2], { label: body.label ? String(body.label) : null }) }, 201);
    }

    if (
      request.method === "POST" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "snapshots" &&
      parts[5] === "restore" &&
      parts.length === 6
    ) {
      restoreSnapshot(parts[2], parts[4]);
      return json({ ok: true });
    }

    if (
      request.method === "DELETE" &&
      parts[0] === "api" &&
      parts[1] === "projects" &&
      parts[3] === "snapshots" &&
      parts.length === 5
    ) {
      return json({ ok: deleteSnapshot(parts[2], parts[4]) });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message.endsWith("not found") || message.endsWith("Not found") ? 404 : 400;
    return json({ error: message }, status);
  }
}

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3001);
  const server = Bun.serve({
    port,
    fetch: handleRequest,
  });

  console.log(`API server running at http://localhost:${server.port}`);
}
