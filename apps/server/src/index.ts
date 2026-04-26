import {
  addTaskToActiveSprint,
  completeActiveSprint,
  createEpic,
  createProject,
  createTask,
  getProjectBoard,
  listProjects,
  moveEpic,
  moveTask,
  removeTaskFromSprint,
  startSprint,
  type TaskStatus,
  updateEpic,
  updateTask,
} from "./db";

type Direction = "up" | "down";

type JsonBody = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function empty(status = 204) {
  return new Response(null, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
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
      parts[5] === "move" &&
      parts.length === 6
    ) {
      const body = await parseBody<{ direction?: unknown }>(request);
      return json({ task: moveTask(parts[2], parts[4], getDirection(body.direction)) });
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
