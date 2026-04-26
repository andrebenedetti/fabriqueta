import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let handleRequest: typeof import("../apps/server/src/index").handleRequest;
let projectsDir: string;
let previousProjectsDir: string | undefined;

beforeAll(async () => {
  previousProjectsDir = process.env.FABRIQUETA_PROJECTS_DIR;
  projectsDir = mkdtempSync(join(tmpdir(), "fabriqueta-tests-"));
  process.env.FABRIQUETA_PROJECTS_DIR = projectsDir;
  ({ handleRequest } = await import("../apps/server/src/index"));
});

afterAll(() => {
  rmSync(projectsDir, { recursive: true, force: true });

  if (previousProjectsDir === undefined) {
    delete process.env.FABRIQUETA_PROJECTS_DIR;
  } else {
    process.env.FABRIQUETA_PROJECTS_DIR = previousProjectsDir;
  }
});

async function apiRequest(method: string, path: string, body?: unknown) {
  const response = await handleRequest(
    new Request(`http://local${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  return { response, payload };
}

describe("HTTP API", () => {
  test("keeps projects isolated and preserves the backlog-to-sprint workflow", async () => {
    const alphaProjectResult = await apiRequest("POST", "/api/projects", { name: "Alpha Delivery" });
    expect(alphaProjectResult.response.status).toBe(201);

    const alphaProject = alphaProjectResult.payload?.project as { slug: string; name: string };
    expect(alphaProject.slug).toBe("alpha-delivery");
    expect(existsSync(join(projectsDir, "alpha-delivery.sqlite"))).toBe(true);

    const betaProjectResult = await apiRequest("POST", "/api/projects", { name: "Beta Delivery" });
    expect(betaProjectResult.response.status).toBe(201);

    const betaProject = betaProjectResult.payload?.project as { slug: string };
    expect(existsSync(join(projectsDir, "beta-delivery.sqlite"))).toBe(true);

    const firstEpicResult = await apiRequest("POST", `/api/projects/${alphaProject.slug}/epics`, {
      title: "Execution",
    });
    const secondEpicResult = await apiRequest("POST", `/api/projects/${alphaProject.slug}/epics`, {
      title: "Follow-up",
    });

    const firstEpic = firstEpicResult.payload?.epic as { id: string; title: string };
    const secondEpic = secondEpicResult.payload?.epic as { id: string; title: string };

    expect(firstEpic.title).toBe("Execution");
    expect(secondEpic.title).toBe("Follow-up");

    await apiRequest("POST", `/api/projects/${alphaProject.slug}/epics/${secondEpic.id}/move`, {
      direction: "up",
    });

    const taskOneResult = await apiRequest(
      "POST",
      `/api/projects/${alphaProject.slug}/epics/${firstEpic.id}/tasks`,
      { title: "Implement board view" },
    );
    const taskTwoResult = await apiRequest(
      "POST",
      `/api/projects/${alphaProject.slug}/epics/${firstEpic.id}/tasks`,
      { title: "Implement backlog view" },
    );

    const taskOne = taskOneResult.payload?.task as { id: string; title: string };
    const taskTwo = taskTwoResult.payload?.task as { id: string; title: string };

    await apiRequest("POST", `/api/projects/${alphaProject.slug}/tasks/${taskTwo.id}/move`, {
      direction: "up",
    });

    const sprintResult = await apiRequest("POST", `/api/projects/${alphaProject.slug}/sprints`, {
      name: "Sprint 1",
    });
    expect(sprintResult.response.status).toBe(201);

    await apiRequest("POST", `/api/projects/${alphaProject.slug}/tasks/${taskTwo.id}/sprint`, {
      action: "add",
    });
    await apiRequest("POST", `/api/projects/${alphaProject.slug}/tasks/${taskOne.id}/sprint`, {
      action: "add",
    });
    await apiRequest("POST", `/api/projects/${alphaProject.slug}/tasks/${taskOne.id}/sprint`, {
      action: "remove",
    });

    await apiRequest("PATCH", `/api/projects/${alphaProject.slug}/tasks/${taskTwo.id}`, {
      title: taskTwo.title,
      description: "",
      status: "in_progress",
    });
    await apiRequest("PATCH", `/api/projects/${alphaProject.slug}/tasks/${taskTwo.id}`, {
      title: taskTwo.title,
      description: "",
      status: "done",
    });

    const docsDirectoryResult = await apiRequest(
      "POST",
      `/api/projects/${alphaProject.slug}/documentation/nodes`,
      {
        kind: "directory",
        name: "product",
      },
    );
    const docsDirectory = docsDirectoryResult.payload?.node as { id: string; name: string };

    const nestedDirectoryResult = await apiRequest(
      "POST",
      `/api/projects/${alphaProject.slug}/documentation/nodes`,
      {
        kind: "directory",
        parentId: docsDirectory.id,
        name: "flows",
      },
    );
    const nestedDirectory = nestedDirectoryResult.payload?.node as { id: string; name: string };

    const docsPageResult = await apiRequest(
      "POST",
      `/api/projects/${alphaProject.slug}/documentation/nodes`,
      {
        kind: "page",
        parentId: nestedDirectory.id,
        name: "checkout",
        content: "# Checkout\n\nCapture the end-to-end payment flow.",
      },
    );
    const docsPage = docsPageResult.payload?.node as { id: string; name: string };

    expect(docsPage.name).toBe("checkout.md");

    await apiRequest(
      "PATCH",
      `/api/projects/${alphaProject.slug}/documentation/nodes/${nestedDirectory.id}`,
      {
        name: "journeys",
      },
    );
    await apiRequest(
      "PATCH",
      `/api/projects/${alphaProject.slug}/documentation/nodes/${docsPage.id}`,
      {
        name: "checkout-happy-path",
        content: "# Checkout happy path\n\nDocument the ideal buyer journey.",
      },
    );

    const alphaBoardResult = await apiRequest("GET", `/api/projects/${alphaProject.slug}/board`);
    expect(alphaBoardResult.response.status).toBe(200);

    const alphaBoard = alphaBoardResult.payload as {
      activeSprint: { name: string } | null;
      sprintTasks: Array<{ id: string; title: string; status: string }>;
      epics: Array<{ title: string; tasks: Array<{ title: string }> }>;
    };

    expect(alphaBoard.activeSprint?.name).toBe("Sprint 1");
    expect(alphaBoard.epics.map((epic) => epic.title)).toEqual(["Follow-up", "Execution"]);
    expect(alphaBoard.epics[1]?.tasks.map((task) => task.title)).toEqual([
      "Implement backlog view",
      "Implement board view",
    ]);
    expect(alphaBoard.sprintTasks).toHaveLength(1);
    expect(alphaBoard.sprintTasks[0]).toMatchObject({
      id: taskTwo.id,
      title: "Implement backlog view",
      status: "done",
    });

    const alphaDocumentationResult = await apiRequest(
      "GET",
      `/api/projects/${alphaProject.slug}/documentation`,
    );
    expect(alphaDocumentationResult.response.status).toBe(200);

    const alphaDocumentation = alphaDocumentationResult.payload as {
      nodes: Array<{
        name: string;
        kind: string;
        children: Array<{
          name: string;
          children: Array<{ name: string; content: string; path: string }>;
        }>;
      }>;
    };

    expect(alphaDocumentation.nodes).toEqual([
      expect.objectContaining({
        name: "product",
        kind: "directory",
        children: [
          expect.objectContaining({
            name: "journeys",
            children: [
              expect.objectContaining({
                name: "checkout-happy-path.md",
                path: "product/journeys/checkout-happy-path.md",
                content: "# Checkout happy path\n\nDocument the ideal buyer journey.",
              }),
            ],
          }),
        ],
      }),
    ]);

    const betaBoardResult = await apiRequest("GET", `/api/projects/${betaProject.slug}/board`);
    const betaBoard = betaBoardResult.payload as {
      activeSprint: null;
      sprintTasks: unknown[];
      epics: unknown[];
    };

    expect(betaBoard.activeSprint).toBeNull();
    expect(betaBoard.sprintTasks).toHaveLength(0);
    expect(betaBoard.epics).toHaveLength(0);

    const betaDocumentationResult = await apiRequest(
      "GET",
      `/api/projects/${betaProject.slug}/documentation`,
    );
    const betaDocumentation = betaDocumentationResult.payload as { nodes: unknown[] };
    expect(betaDocumentation.nodes).toHaveLength(0);

    const deleteDocumentationResult = await apiRequest(
      "DELETE",
      `/api/projects/${alphaProject.slug}/documentation/nodes/${docsDirectory.id}`,
    );
    expect(deleteDocumentationResult.response.status).toBe(200);

    const docsAfterDeleteResult = await apiRequest(
      "GET",
      `/api/projects/${alphaProject.slug}/documentation`,
    );
    const docsAfterDelete = docsAfterDeleteResult.payload as { nodes: unknown[] };
    expect(docsAfterDelete.nodes).toHaveLength(0);

    const completeSprintResult = await apiRequest(
      "POST",
      `/api/projects/${alphaProject.slug}/sprints/complete`,
      {},
    );
    expect(completeSprintResult.response.status).toBe(200);

    const boardAfterCompletionResult = await apiRequest(
      "GET",
      `/api/projects/${alphaProject.slug}/board`,
    );
    const boardAfterCompletion = boardAfterCompletionResult.payload as {
      activeSprint: null;
      sprintTasks: unknown[];
    };

    expect(boardAfterCompletion.activeSprint).toBeNull();
    expect(boardAfterCompletion.sprintTasks).toHaveLength(0);
  });
});

describe("MCP server", () => {
  test("supports real stdio client interactions for tools, resources, and prompts", async () => {
    const client = new Client(
      { name: "fabriqueta-test-client", version: "0.1.0" },
      { capabilities: {} },
    );

    const transport = new StdioClientTransport({
      command: "bun",
      args: ["src/index.ts"],
      cwd: join(process.cwd(), "apps/mcp-server"),
      env: {
        ...process.env,
        FABRIQUETA_PROJECTS_DIR: projectsDir,
      } as Record<string, string>,
    });

    await client.connect(transport);

    try {
      const tools = await client.listTools();
      const resources = await client.listResources();
      const resourceTemplates = await client.listResourceTemplates();
      const prompts = await client.listPrompts();

      expect(tools.tools.some((tool) => tool.name === "get_project_board")).toBe(true);
      expect(tools.tools.some((tool) => tool.name === "update_task_status")).toBe(true);
      expect(tools.tools.some((tool) => tool.name === "get_project_documentation")).toBe(true);
      expect(tools.tools.some((tool) => tool.name === "create_documentation_node")).toBe(true);
      expect(resources.resources.some((resource) => resource.uri === "fabriqueta://projects")).toBe(
        true,
      );
      expect(
        resourceTemplates.resourceTemplates.some(
          (resource) => resource.uriTemplate === "fabriqueta://projects/{projectSlug}/sprint",
        ),
      ).toBe(true);
      expect(
        resourceTemplates.resourceTemplates.some(
          (resource) =>
            resource.uriTemplate === "fabriqueta://projects/{projectSlug}/documentation",
        ),
      ).toBe(true);
      expect(
        resourceTemplates.resourceTemplates.some(
          (resource) =>
            resource.uriTemplate ===
            "fabriqueta://projects/{projectSlug}/documentation/nodes/{nodeId}",
        ),
      ).toBe(true);
      expect(prompts.prompts.some((prompt) => prompt.name === "plan-next-sprint")).toBe(true);
      expect(prompts.prompts.some((prompt) => prompt.name === "execute-active-sprint")).toBe(true);
      expect(
        prompts.prompts.some((prompt) => prompt.name === "review-project-documentation"),
      ).toBe(true);

      const createProjectResult = await client.callTool({
        name: "create_project",
        arguments: { name: "Gamma Ops" },
      });
      expect(createProjectResult.isError).toBeUndefined();

      const createdProject = createProjectResult.structuredContent as {
        slug: string;
        name: string;
      };
      expect(createdProject.slug).toBe("gamma-ops");

      const createEpicResult = await client.callTool({
        name: "create_epic",
        arguments: { projectSlug: createdProject.slug, title: "Operations" },
      });
      const createdEpic = createEpicResult.structuredContent as { id: string; title: string };

      const createTaskResult = await client.callTool({
        name: "create_task",
        arguments: {
          projectSlug: createdProject.slug,
          epicId: createdEpic.id,
          title: "Take ownership of next task",
        },
      });
      const createdTask = createTaskResult.structuredContent as { id: string; title: string };

      await client.callTool({
        name: "start_sprint",
        arguments: { projectSlug: createdProject.slug, name: "Ops Sprint" },
      });
      await client.callTool({
        name: "add_task_to_active_sprint",
        arguments: { projectSlug: createdProject.slug, taskId: createdTask.id },
      });
      await client.callTool({
        name: "update_task_status",
        arguments: {
          projectSlug: createdProject.slug,
          taskId: createdTask.id,
          status: "in_progress",
        },
      });

      const createDocsDirectoryResult = await client.callTool({
        name: "create_documentation_node",
        arguments: {
          projectSlug: createdProject.slug,
          kind: "directory",
          name: "specs",
        },
      });
      const createdDocsDirectory = createDocsDirectoryResult.structuredContent as {
        id: string;
        name: string;
      };

      const createDocsPageResult = await client.callTool({
        name: "create_documentation_node",
        arguments: {
          projectSlug: createdProject.slug,
          kind: "page",
          parentId: createdDocsDirectory.id,
          name: "handoff",
          content: "# Handoff\n\nCapture agent operating notes.",
        },
      });
      const createdDocsPage = createDocsPageResult.structuredContent as {
        id: string;
        name: string;
      };

      await client.callTool({
        name: "update_documentation_node",
        arguments: {
          projectSlug: createdProject.slug,
          nodeId: createdDocsPage.id,
          name: "agent-handoff",
          content: "# Agent handoff\n\nKeep the product spec current while executing work.",
        },
      });

      const boardResult = await client.callTool({
        name: "get_project_board",
        arguments: { projectSlug: createdProject.slug },
      });
      const board = boardResult.structuredContent as {
        activeSprint: { name: string } | null;
        sprintTasks: Array<{ id: string; status: string }>;
      };

      expect(board.activeSprint?.name).toBe("Ops Sprint");
      expect(board.sprintTasks).toEqual([
        expect.objectContaining({ id: createdTask.id, status: "in_progress" }),
      ]);

      const sprintResource = await client.readResource({
        uri: `fabriqueta://projects/${createdProject.slug}/sprint`,
      });

      const sprintPayload = JSON.parse(sprintResource.contents[0]?.text ?? "{}") as {
        sprintTasks: Array<{ id: string; status: string }>;
      };
      expect(sprintPayload.sprintTasks).toEqual([
        expect.objectContaining({ id: createdTask.id, status: "in_progress" }),
      ]);

      const documentationResult = await client.callTool({
        name: "get_project_documentation",
        arguments: { projectSlug: createdProject.slug },
      });
      const documentation = documentationResult.structuredContent as {
        nodes: Array<{
          id: string;
          name: string;
          children: Array<{ id: string; name: string; content: string }>;
        }>;
      };

      expect(documentation.nodes).toEqual([
        expect.objectContaining({
          id: createdDocsDirectory.id,
          name: "specs",
          children: [
            expect.objectContaining({
              id: createdDocsPage.id,
              name: "agent-handoff.md",
              content: "# Agent handoff\n\nKeep the product spec current while executing work.",
            }),
          ],
        }),
      ]);

      const documentationResource = await client.readResource({
        uri: `fabriqueta://projects/${createdProject.slug}/documentation`,
      });
      const documentationPayload = JSON.parse(documentationResource.contents[0]?.text ?? "{}") as {
        nodes: Array<{ name: string }>;
      };
      expect(documentationPayload.nodes[0]?.name).toBe("specs");

      const pageResource = await client.readResource({
        uri: `fabriqueta://projects/${createdProject.slug}/documentation/nodes/${createdDocsPage.id}`,
      });
      const pagePayload = JSON.parse(pageResource.contents[0]?.text ?? "{}") as {
        path: string;
        content: string;
      };
      expect(pagePayload.path).toBe("specs/agent-handoff.md");
      expect(pagePayload.content).toBe(
        "# Agent handoff\n\nKeep the product spec current while executing work.",
      );

      const promptResult = await client.getPrompt({
        name: "execute-active-sprint",
        arguments: { projectSlug: createdProject.slug },
      });
      expect(promptResult.messages.map((message) => message.content.type)).toEqual([
        "text",
        "resource",
      ]);
      expect(promptResult.messages[1]?.content.type).toBe("resource");
      if (promptResult.messages[1]?.content.type === "resource") {
        expect(promptResult.messages[1].content.resource.uri).toBe(
          `fabriqueta://projects/${createdProject.slug}/sprint`,
        );
      }

      const documentationPromptResult = await client.getPrompt({
        name: "review-project-documentation",
        arguments: { projectSlug: createdProject.slug },
      });
      expect(documentationPromptResult.messages.map((message) => message.content.type)).toEqual([
        "text",
        "resource",
      ]);
      expect(documentationPromptResult.messages[1]?.content.type).toBe("resource");
      if (documentationPromptResult.messages[1]?.content.type === "resource") {
        expect(documentationPromptResult.messages[1].content.resource.uri).toBe(
          `fabriqueta://projects/${createdProject.slug}/documentation`,
        );
      }
    } finally {
      await transport.close();
    }
  });
});
