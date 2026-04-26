import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  addTaskToActiveSprint,
  completeActiveSprint,
  createDocumentationNode,
  createEpic,
  createProject,
  createTask,
  deleteEpic,
  deleteDocumentationNode,
  deleteTask,
  getProjectBoard,
  getProjectDocumentation,
  listProjects,
  moveEpic,
  moveTask,
  removeTaskFromSprint,
  startSprint,
  type DocumentationNode,
  type DocumentationNodeKind,
  type TaskStatus,
  updateDocumentationNode,
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

function successResult<T extends Record<string, unknown> | undefined>(
  summary: string,
  structuredContent?: T,
) {
  return {
    content: [{ type: "text" as const, text: summary }],
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
    description: "List all Fabriqueta projects available to the agent.",
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

const transport = new StdioServerTransport();

await server.connect(transport);
