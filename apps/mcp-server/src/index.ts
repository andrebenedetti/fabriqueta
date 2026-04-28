import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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
} from "../../server/src/db";

const server = new McpServer({
  name: "fabriqueta-projects",
  version: "0.1.0",
});

const statusSchema = z.enum(["todo", "in_progress", "done"]);
const directionSchema = z.enum(["up", "down"]);
const documentationKindSchema = z.enum(["directory", "page"]);

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function singleValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function successResult<T>(summary: string, structuredContent?: T) {
  const text =
    structuredContent !== undefined
      ? `${summary}\n\n${jsonText(structuredContent)}`
      : summary;
  return {
    content: [{ type: "text" as const, text }],
    structuredContent,
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function formatProjectBoard(projectSlug: string) {
  const board = getProjectBoard(projectSlug);

  return {
    project: board.project,
    activeSprint: board.activeSprint,
    sprintHistory: board.sprintHistory,
    sprintTasks: board.sprintTasks,
    epics: board.epics,
    backlogTaskCount: board.epics.reduce((count, epic) => count + epic.tasks.length, 0),
  };
}

function formatProjectDocumentation(projectSlug: string) {
  const documentation = getProjectDocumentation(projectSlug);

  return {
    project: documentation.project,
    nodes: documentation.nodes,
  };
}

function getTaskFromBoard(projectSlug: string, taskId: string) {
  const board = getProjectBoard(projectSlug);

  for (const epic of board.epics) {
    const task = epic.tasks.find((candidate) => candidate.id === taskId);
    if (task) {
      return task;
    }
  }

  throw new Error("Task not found");
}

function getTaskContextFromProject(projectSlug: string, taskId: string) {
  const board = getProjectBoard(projectSlug);

  for (const epic of board.epics) {
    const task = epic.tasks.find((candidate) => candidate.id === taskId);
    if (task) {
      return {
        project: board.project,
        activeSprint: board.activeSprint,
        epic: {
          id: epic.id,
          title: epic.title,
          description: epic.description,
          position: epic.position,
        },
        task: {
          ...task,
          claimedBy: task.claimedBy,
        },
      };
    }
  }

  throw new Error("Task not found");
}

function findDocumentationNode(nodes: DocumentationNode[], nodeId: string): DocumentationNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nested = findDocumentationNode(node.children, nodeId);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function getDocumentationNodeFromProject(projectSlug: string, nodeId: string) {
  const documentation = getProjectDocumentation(projectSlug);
  const node = findDocumentationNode(documentation.nodes, nodeId);

  if (!node) {
    throw new Error("Documentation node not found");
  }

  return node;
}

server.registerResource(
  "projects",
  "fabriqueta://projects",
  {
    title: "Projects",
    description: "All known Fabriqueta projects and their summary counts.",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: jsonText({ projects: listProjects() }),
      },
    ],
  }),
);

server.registerResource(
  "project-board",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/board", { list: undefined }),
  {
    title: "Project board",
    description: "The full project board, including epics, tasks, and the active sprint.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug }) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: jsonText(formatProjectBoard(singleValue(projectSlug))),
      },
    ],
  }),
);

server.registerResource(
  "project-backlog",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/backlog", { list: undefined }),
  {
    title: "Project backlog",
    description: "Backlog-focused project data for planning work and creating the next sprint.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug }) => {
    const board = getProjectBoard(singleValue(projectSlug));

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText({
            project: board.project,
            activeSprint: board.activeSprint,
            epics: board.epics,
          }),
        },
      ],
    };
  },
);

server.registerResource(
  "project-sprint-board",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/sprint", { list: undefined }),
  {
    title: "Active sprint board",
    description: "Only the active sprint and its tasks, grouped for agent execution.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug }) => {
    const board = getProjectBoard(singleValue(projectSlug));

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText({
            project: board.project,
            activeSprint: board.activeSprint,
            sprintTasks: board.sprintTasks,
          }),
        },
      ],
    };
  },
);

server.registerResource(
  "project-task",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/tasks/{taskId}", { list: undefined }),
  {
    title: "Task context",
    description: "A specific task with its full description, epic, and active sprint context.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug, taskId }) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: jsonText(getTaskContextFromProject(singleValue(projectSlug), singleValue(taskId))),
      },
    ],
  }),
);

server.registerResource(
  "project-documentation",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/documentation", { list: undefined }),
  {
    title: "Project documentation",
    description: "The markdown documentation tree stored inside a project database.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug }) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: jsonText(formatProjectDocumentation(singleValue(projectSlug))),
      },
    ],
  }),
);

server.registerResource(
  "project-documentation-node",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/documentation/nodes/{nodeId}", {
    list: undefined,
  }),
  {
    title: "Documentation node",
    description: "A specific documentation directory or markdown page from a project.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug, nodeId }) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: jsonText(
          getDocumentationNodeFromProject(singleValue(projectSlug), singleValue(nodeId)),
        ),
      },
    ],
  }),
);

server.registerResource(
  "documentation-search",
  new ResourceTemplate(
    "fabriqueta://projects/{projectSlug}/documentation/search",
    { list: undefined },
  ),
  {
    title: "Documentation search",
    description:
      "Search documentation nodes by name and content. Returns matching nodes with path, content snippet, and position.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug }) => {
    const searchParams = new URL(uri.href, "http://localhost").searchParams;
    const query = searchParams.get("q") ?? "";
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20;

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText({
            query,
            results: searchDocumentation(singleValue(projectSlug), query, { limit }),
          }),
        },
      ],
    };
  },
);

server.registerResource(
  "project-documentation-by-path",
  new ResourceTemplate(
    "fabriqueta://projects/{projectSlug}/documentation/by-path/{path*}",
    { list: undefined },
  ),
  {
    title: "Documentation node by path",
    description:
      "Look up a documentation node by its filesystem-style path (e.g. 'product/core-workflow.md'). Returns the node or null if not found.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug, path }) => {
    const node = findDocumentationNodeByPath(singleValue(projectSlug), singleValue(path));

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText(node ?? { error: "Documentation node not found", path: singleValue(path) }),
        },
      ],
    };
  },
);

server.registerResource(
  "project-summary",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/summary", { list: undefined }),
  {
    title: "Compact project summary",
    description:
      "A lightweight project summary with counts and sprint status for low-token agent planning.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug }) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: jsonText(getCompactProjectSummary(singleValue(projectSlug))),
      },
    ],
  }),
);

server.registerResource(
  "task-context-bundle",
  new ResourceTemplate(
    "fabriqueta://projects/{projectSlug}/tasks/{taskId}/context",
    { list: undefined },
  ),
  {
    title: "Task context bundle",
    description:
      "Composite context for a task: task details, epic, active sprint state, and linked documentation in one response.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug, taskId }) => {
    const board = getProjectBoard(singleValue(projectSlug));
    const taskSlug = singleValue(taskId);
    let taskContext = null;

    for (const epic of board.epics) {
      const task = epic.tasks.find((candidate) => candidate.id === taskSlug);
      if (task) {
        taskContext = {
          project: board.project,
          activeSprint: board.activeSprint,
          epic: {
            id: epic.id,
            title: epic.title,
            description: epic.description,
            position: epic.position,
          },
          task: {
            ...task,
            claimedBy: task.claimedBy,
          },
        };
        break;
      }
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText(taskContext ?? { error: "Task not found", taskId: taskSlug }),
        },
      ],
    };
  },
);

server.registerResource(
  "project-activity",
  new ResourceTemplate("fabriqueta://projects/{projectSlug}/activity", { list: undefined }),
  {
    title: "Project activity log",
    description: "The activity/audit log for a project, with the most recent entries first.",
    mimeType: "application/json",
  },
  async (uri, { projectSlug }) => {
    const searchParams = new URL(uri.href, "http://localhost").searchParams;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText({
            activities: getActivityLog(singleValue(projectSlug), { limit, offset }),
          }),
        },
      ],
    };
  },
);

server.registerPrompt(
  "plan-next-sprint",
  {
    title: "Plan Next Sprint",
    description: "Load the backlog context for a project and plan the next sprint.",
    argsSchema: {
      projectSlug: z.string(),
      goal: z.string().optional(),
    },
  },
  ({ projectSlug, goal }) => {
    const board = getProjectBoard(projectSlug);

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: goal
              ? `Plan the next sprint for project "${projectSlug}" with this goal: ${goal}`
              : `Plan the next sprint for project "${projectSlug}".`,
          },
        },
        {
          role: "user" as const,
          content: {
            type: "resource" as const,
            resource: {
              uri: `fabriqueta://projects/${projectSlug}/backlog`,
              mimeType: "application/json",
              text: jsonText({
                project: board.project,
                activeSprint: board.activeSprint,
                epics: board.epics,
              }),
            },
          },
        },
      ],
    };
  },
);

server.registerPrompt(
  "execute-active-sprint",
  {
    title: "Execute Active Sprint",
    description: "Load the active sprint board so an agent can decide what to do next.",
    argsSchema: {
      projectSlug: z.string(),
      focus: z.string().optional(),
    },
  },
  ({ projectSlug, focus }) => {
    const board = getProjectBoard(projectSlug);

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: focus
              ? `Review the active sprint for "${projectSlug}" and focus on: ${focus}`
              : `Review the active sprint for "${projectSlug}" and choose the most relevant next task.`,
          },
        },
        {
          role: "user" as const,
          content: {
            type: "resource" as const,
            resource: {
              uri: `fabriqueta://projects/${projectSlug}/sprint`,
              mimeType: "application/json",
              text: jsonText({
                project: board.project,
                activeSprint: board.activeSprint,
                sprintTasks: board.sprintTasks,
              }),
            },
          },
        },
      ],
    };
  },
);

server.registerPrompt(
  "review-project-documentation",
  {
    title: "Review Project Documentation",
    description: "Load the documentation tree for a project so an agent can inspect or update specs.",
    argsSchema: {
      projectSlug: z.string(),
      focus: z.string().optional(),
    },
  },
  ({ projectSlug, focus }) => {
    const documentation = formatProjectDocumentation(projectSlug);

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: focus
              ? `Review the documentation for "${projectSlug}" and focus on: ${focus}`
              : `Review the documentation for "${projectSlug}" and identify the most relevant product spec context.`,
          },
        },
        {
          role: "user" as const,
          content: {
            type: "resource" as const,
            resource: {
              uri: `fabriqueta://projects/${projectSlug}/documentation`,
              mimeType: "application/json",
              text: jsonText(documentation),
            },
          },
        },
      ],
    };
  },
);

server.registerTool(
  "list_projects",
  {
    title: "List projects",
    description:
      "List all Fabriqueta projects with slug, name, counts, and createdAt. Use each project's slug as projectSlug in other tools.",
    inputSchema: {},
  },
  async () => {
    try {
      const projects = listProjects();
      return successResult(`Found ${projects.length} project(s).`, { projects });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to list projects");
    }
  },
);

server.registerTool(
  "get_project_board",
  {
    title: "Get project board",
    description: "Read the current board state for a project, including sprint and backlog data.",
    inputSchema: {
      projectSlug: z.string(),
    },
  },
  async ({ projectSlug }) => {
    try {
      const board = formatProjectBoard(projectSlug);
      return successResult(`Loaded project board for "${projectSlug}".`, board);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to load project board");
    }
  },
);

server.registerTool(
  "get_task_context",
  {
    title: "Get task context",
    description: "Read one task with its description, epic, and active sprint context.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
    },
  },
  async ({ projectSlug, taskId }) => {
    try {
      const taskContext = getTaskContextFromProject(projectSlug, taskId);
      return successResult(`Loaded task context for "${taskContext.task.title}".`, taskContext);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to load task context");
    }
  },
);

server.registerTool(
  "create_project",
  {
    title: "Create project",
    description: "Create a new self-contained project database.",
    inputSchema: {
      name: z.string(),
    },
  },
  async ({ name }) => {
    try {
      const project = createProject(name);
      return successResult(`Created project "${project.name}".`, project);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to create project");
    }
  },
);

server.registerTool(
  "create_epic",
  {
    title: "Create epic",
    description: "Create a new epic in a project backlog.",
    inputSchema: {
      projectSlug: z.string(),
      title: z.string(),
      description: z.string().optional(),
    },
  },
  async ({ projectSlug, title, description }) => {
    try {
      const epic = createEpic(projectSlug, { title, description });
      return successResult(`Created epic "${epic.title}" in "${projectSlug}".`, epic);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to create epic");
    }
  },
);

server.registerTool(
  "update_epic",
  {
    title: "Update epic",
    description: "Update an epic's title or description.",
    inputSchema: {
      projectSlug: z.string(),
      epicId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
    },
  },
  async ({ projectSlug, epicId, title, description }) => {
    try {
      const board = getProjectBoard(projectSlug);
      const epic = board.epics.find((candidate) => candidate.id === epicId);
      if (!epic) {
        throw new Error("Epic not found");
      }

      const updated = updateEpic(projectSlug, epicId, {
        title: title ?? epic.title,
        description: description ?? epic.description,
      });
      return successResult(`Updated epic "${updated.title}" in "${projectSlug}".`, updated);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to update epic");
    }
  },
);

server.registerTool(
  "create_task",
  {
    title: "Create task",
    description: "Create a new backlog task under an epic.",
    inputSchema: {
      projectSlug: z.string(),
      epicId: z.string(),
      title: z.string(),
      description: z.string().optional(),
    },
  },
  async ({ projectSlug, epicId, title, description }) => {
    try {
      const task = createTask(projectSlug, epicId, { title, description });
      return successResult(`Created task "${task.title}" in "${projectSlug}".`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to create task");
    }
  },
);

server.registerTool(
  "start_sprint",
  {
    title: "Start sprint",
    description: "Start a new active sprint for a project.",
    inputSchema: {
      projectSlug: z.string(),
      name: z.string(),
    },
  },
  async ({ projectSlug, name }) => {
    try {
      const sprint = startSprint(projectSlug, { name });
      return successResult(`Started sprint "${sprint.name}" in "${projectSlug}".`, sprint);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to start sprint");
    }
  },
);

server.registerTool(
  "complete_active_sprint",
  {
    title: "Complete active sprint",
    description: "Complete the active sprint for a project.",
    inputSchema: {
      projectSlug: z.string(),
    },
  },
  async ({ projectSlug }) => {
    try {
      const sprintId = completeActiveSprint(projectSlug);
      return successResult(`Completed the active sprint in "${projectSlug}".`, { sprintId });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to complete sprint");
    }
  },
);

server.registerTool(
  "update_sprint_retrospective_notes",
  {
    title: "Update sprint retrospective notes",
    description: "Save retrospective notes for an active or completed sprint.",
    inputSchema: {
      projectSlug: z.string(),
      sprintId: z.string(),
      retrospectiveNotes: z.string(),
    },
  },
  async ({ projectSlug, sprintId, retrospectiveNotes }) => {
    try {
      const sprint = updateSprintRetrospectiveNotes(projectSlug, sprintId, retrospectiveNotes);
      return successResult(`Updated retrospective notes for sprint "${sprint.name}".`, sprint);
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to update sprint retrospective notes",
      );
    }
  },
);

server.registerTool(
  "add_task_to_active_sprint",
  {
    title: "Add task to active sprint",
    description: "Add a backlog task to the active sprint.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
    },
  },
  async ({ projectSlug, taskId }) => {
    try {
      const task = addTaskToActiveSprint(projectSlug, taskId);
      return successResult(`Added task "${task.title}" to the active sprint.`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to add task to sprint");
    }
  },
);

server.registerTool(
  "remove_task_from_sprint",
  {
    title: "Remove task from sprint",
    description: "Remove a task from whichever sprint it is currently assigned to.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
    },
  },
  async ({ projectSlug, taskId }) => {
    try {
      const task = removeTaskFromSprint(projectSlug, taskId);
      return successResult(`Removed task "${task.title}" from sprint assignment.`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to remove task from sprint");
    }
  },
);

server.registerTool(
  "claim_task",
  {
    title: "Claim task",
    description: "Claim a task for execution. Prevents other agents from picking up the same task.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
      claimedBy: z.string(),
    },
  },
  async ({ projectSlug, taskId, claimedBy }) => {
    try {
      const task = claimTask(projectSlug, taskId, claimedBy);
      return successResult(`Claimed task "${task.title}" for "${claimedBy}".`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to claim task");
    }
  },
);

server.registerTool(
  "release_task",
  {
    title: "Release task",
    description: "Release a claimed task so other agents can pick it up.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
    },
  },
  async ({ projectSlug, taskId }) => {
    try {
      const task = releaseTask(projectSlug, taskId);
      return successResult(`Released task "${task.title}".`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to release task");
    }
  },
);

server.registerTool(
  "update_task_status",
  {
    title: "Update task status",
    description: "Move a task between to-do, in progress, and done.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
      status: statusSchema,
      title: z.string().optional(),
      description: z.string().optional(),
    },
  },
  async ({ projectSlug, taskId, status, title, description }) => {
    try {
      const currentTask = getTaskFromBoard(projectSlug, taskId);
      const task = updateTask(projectSlug, taskId, {
        title: title ?? currentTask.title,
        description: description ?? currentTask.description,
        status: status as TaskStatus,
      });

      return successResult(`Updated "${task.title}" to status "${task.status}".`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to update task status");
    }
  },
);

server.registerTool(
  "update_task",
  {
    title: "Update task",
    description: "Update a task's title, description, or status independently. Unlike update_task_status, this does not require passing a status when only text fields change.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: statusSchema.optional(),
    },
  },
  async ({ projectSlug, taskId, title, description, status }) => {
    try {
      const currentTask = getTaskFromBoard(projectSlug, taskId);
      const task = updateTask(projectSlug, taskId, {
        title: title ?? currentTask.title,
        description: description ?? currentTask.description,
        status: status as TaskStatus | undefined,
      });

      return successResult(`Updated task "${task.title}".`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to update task");
    }
  },
);

server.registerTool(
  "move_epic",
  {
    title: "Move epic",
    description: "Reorder an epic up or down in the backlog.",
    inputSchema: {
      projectSlug: z.string(),
      epicId: z.string(),
      direction: directionSchema,
    },
  },
  async ({ projectSlug, epicId, direction }) => {
    try {
      const epic = moveEpic(projectSlug, epicId, direction);
      return successResult(`Moved epic "${epic.title}" ${direction}.`, epic);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to move epic");
    }
  },
);

server.registerTool(
  "move_task",
  {
    title: "Move task",
    description: "Reorder a task up or down within its epic.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
      direction: directionSchema,
    },
  },
  async ({ projectSlug, taskId, direction }) => {
    try {
      const task = moveTask(projectSlug, taskId, direction);
      return successResult(`Moved task "${task.title}" ${direction}.`, task);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to move task");
    }
  },
);

server.registerTool(
  "delete_epic",
  {
    title: "Delete epic",
    description: "Delete an epic from the backlog. This also deletes its tasks.",
    inputSchema: {
      projectSlug: z.string(),
      epicId: z.string(),
    },
  },
  async ({ projectSlug, epicId }) => {
    try {
      const board = getProjectBoard(projectSlug);
      const epic = board.epics.find((candidate) => candidate.id === epicId);
      if (!epic) {
        throw new Error("Epic not found");
      }

      deleteEpic(projectSlug, epicId);
      return successResult(`Deleted epic "${epic.title}".`, { epicId });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to delete epic");
    }
  },
);

server.registerTool(
  "delete_task",
  {
    title: "Delete task",
    description: "Delete a task from a project backlog or sprint.",
    inputSchema: {
      projectSlug: z.string(),
      taskId: z.string(),
    },
  },
  async ({ projectSlug, taskId }) => {
    try {
      const task = getTaskFromBoard(projectSlug, taskId);
      deleteTask(projectSlug, taskId);
      return successResult(`Deleted task "${task.title}".`, { taskId });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to delete task");
    }
  },
);

server.registerTool(
  "search_documentation",
  {
    title: "Search documentation",
    description:
      "Search documentation nodes by name and content. Returns matching nodes with path, content snippet, and position.",
    inputSchema: {
      projectSlug: z.string(),
      query: z.string(),
      limit: z.number().optional(),
    },
  },
  async ({ projectSlug, query, limit }) => {
    try {
      const results = searchDocumentation(projectSlug, query, { limit });
      return successResult(`Found ${results.length} documentation matches for "${query}".`, {
        query,
        results,
      });
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to search documentation",
      );
    }
  },
);

server.registerTool(
  "get_project_documentation",
  {
    title: "Get project documentation",
    description: "Read the documentation tree for a project, including markdown page content.",
    inputSchema: {
      projectSlug: z.string(),
    },
  },
  async ({ projectSlug }) => {
    try {
      const documentation = formatProjectDocumentation(projectSlug);
      return successResult(`Loaded documentation for "${projectSlug}".`, documentation);
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to load project documentation",
      );
    }
  },
);

server.registerTool(
  "create_documentation_node",
  {
    title: "Create documentation node",
    description: "Create a documentation directory or markdown page inside a project.",
    inputSchema: {
      projectSlug: z.string(),
      kind: documentationKindSchema,
      parentId: z.string().nullable().optional(),
      name: z.string(),
      content: z.string().optional(),
    },
  },
  async ({ projectSlug, kind, parentId, name, content }) => {
    try {
      const node = createDocumentationNode(projectSlug, {
        kind: kind as DocumentationNodeKind,
        parentId: parentId ?? null,
        name,
        content,
      });

      return successResult(`Created documentation ${kind} "${node.name}".`, node);
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to create documentation node",
      );
    }
  },
);

server.registerTool(
  "update_documentation_node",
  {
    title: "Update documentation node",
    description: "Rename a documentation node or update markdown content for a page.",
    inputSchema: {
      projectSlug: z.string(),
      nodeId: z.string(),
      name: z.string().optional(),
      content: z.string().optional(),
    },
  },
  async ({ projectSlug, nodeId, name, content }) => {
    try {
      const node = updateDocumentationNode(projectSlug, nodeId, { name, content });
      return successResult(`Updated documentation node "${node.name}".`, node);
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to update documentation node",
      );
    }
  },
);

server.registerTool(
  "delete_documentation_node",
  {
    title: "Delete documentation node",
    description: "Delete a documentation directory or page. Deleting a directory removes its descendants.",
    inputSchema: {
      projectSlug: z.string(),
      nodeId: z.string(),
    },
  },
  async ({ projectSlug, nodeId }) => {
    try {
      const deletedNode = getDocumentationNodeFromProject(projectSlug, nodeId);
      deleteDocumentationNode(projectSlug, nodeId);
      return successResult(`Deleted documentation node "${deletedNode.path}".`, {
        nodeId,
      });
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to delete documentation node",
      );
    }
  },
);

server.registerTool(
  "log_activity",
  {
    title: "Log activity",
    description: "Record an activity or audit event for a project. Used to track agent actions, state changes, and decisions.",
    inputSchema: {
      projectSlug: z.string(),
      actor: z.string(),
      action: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      details: z.string().optional(),
    },
  },
  async ({ projectSlug, actor, action, entityType, entityId, details }) => {
    try {
      const entry = logActivity(projectSlug, { actor, action, entityType, entityId, details });
      return successResult(`Logged activity: ${action} on ${entityType} "${entityId}".`, entry);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to log activity");
    }
  },
);

server.registerTool(
  "get_activity_log",
  {
    title: "Get activity log",
    description: "Read the activity/audit log for a project, with the most recent entries first.",
    inputSchema: {
      projectSlug: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    },
  },
  async ({ projectSlug, limit, offset }) => {
    try {
      const activities = getActivityLog(projectSlug, { limit, offset });
      return successResult(`Loaded ${activities.length} activity entries.`, { activities });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to load activity log");
    }
  },
);

function listSkills(targetDir?: string) {
  const skillsRoot = targetDir
    ? resolve(targetDir, ".claude/skills")
    : resolve(import.meta.dir, "../../../.claude/skills");

  try {
    const entries = readdirSync(skillsRoot, { withFileTypes: true });
    const skills: Array<{ name: string; description: string; path: string }> = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = resolve(skillsRoot, entry.name, "SKILL.md");
      try {
        const content = readFileSync(skillPath, "utf-8");
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) continue;

        const frontmatter = frontmatterMatch[1] ?? "";
        const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
        const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
        const name = nameMatch?.[1]?.trim() ?? entry.name;
        const description = descMatch?.[1]?.trim() ?? "";

        skills.push({ name, description, path: `.claude/skills/${entry.name}/SKILL.md` });
      } catch {
        continue;
      }
    }

    return skills;
  } catch {
    return [];
  }
}

server.registerTool(
  "check_project_health",
  {
    title: "Check project health",
    description:
      "Run hygiene heuristics on a project: detect stale tasks, abandoned sprints, documentation drift, and other issues.",
    inputSchema: {
      projectSlug: z.string(),
    },
  },
  async ({ projectSlug }) => {
    try {
      const health = checkProjectHealth(projectSlug);
      return successResult(
        health.health === "good" ? "Project looks healthy." : `${health.warnings.length} issue(s) found.`,
        health,
      );
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to check project health",
      );
    }
  },
);

server.registerTool(
  "export_documentation",
  {
    title: "Export documentation",
    description:
      "Export a project's documentation tree from the database to markdown files on disk at a specified directory.",
    inputSchema: {
      projectSlug: z.string(),
      targetDir: z.string(),
    },
  },
  async ({ projectSlug, targetDir }) => {
    try {
      const result = exportDocumentationToFilesystem(projectSlug, targetDir);
      return successResult(
        `Exported ${result.count} documentation node(s) to ${result.path}.`,
        result,
      );
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to export documentation",
      );
    }
  },
);

server.registerTool(
  "import_documentation",
  {
    title: "Import documentation",
    description:
      "Import markdown files from a directory on disk into the project's documentation tree. Uses updated_at timestamps for conflict detection (filesystem mtime wins if newer).",
    inputSchema: {
      projectSlug: z.string(),
      sourceDir: z.string(),
    },
  },
  async ({ projectSlug, sourceDir }) => {
    try {
      const result = importDocumentationFromFilesystem(projectSlug, sourceDir);
      return successResult(
        `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.deleted} deleted.`,
        result,
      );
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to import documentation",
      );
    }
  },
);

server.registerTool(
  "list_available_skills",
  {
    title: "List available skills",
    description:
      "Scan .claude/skills/ directories, read each SKILL.md frontmatter, and return all available skills with name and description. Accepts an optional projectSlug to scan a specific project's skill directory.",
    inputSchema: {
      projectSlug: z.string().optional(),
    },
  },
  async ({ projectSlug }) => {
    try {
      let targetDir: string | undefined;

      if (projectSlug) {
        const projectsDir = resolve(import.meta.dir, "../../../data/projects");
        targetDir = resolve(projectsDir, "..");
      }

      const skills = listSkills(targetDir);
      return successResult(`Found ${skills.length} available skill(s).`, { skills });
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : "Failed to list available skills",
      );
    }
  },
);

const transport = new StdioServerTransport();

await server.connect(transport);
