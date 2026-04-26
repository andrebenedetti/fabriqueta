import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Link, createRoute } from "@tanstack/react-router";
import {
  addTaskToSprint,
  completeActiveSprint,
  createDocumentationNode,
  createEpic,
  createTask,
  deleteEpic,
  deleteDocumentationNode,
  deleteTask,
  fetchBoard,
  fetchDocumentation,
  moveEpic,
  moveTask,
  removeTaskFromSprint,
  startSprint,
  updateDocumentationNode,
  updateSprintRetrospectiveNotes,
  updateTask,
  updateTaskStatus,
} from "../api";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { TaskDetailsDialog } from "../components/TaskDetailsDialog";
import type {
  Board,
  Documentation,
  DocumentationNode,
  Epic,
  SprintTask,
  Task,
  TaskStatus,
} from "../types";
import { Route as RootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/projects/$projectSlug",
  component: ProjectPage,
});

type ProjectView = "board" | "backlog" | "documentation";
type BacklogSort = "backlog" | "title" | "epic" | "status";
type ConfirmDialogState = {
  confirmLabel: string;
  message: string;
  onConfirm: () => Promise<boolean>;
  title: string;
};
type BacklogTaskRow = {
  epic: Epic;
  task: Task;
};

function findDocumentationNode(nodes: DocumentationNode[], nodeId: string | null): DocumentationNode | null {
  if (!nodeId) {
    return null;
  }

  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nestedMatch = findDocumentationNode(node.children, nodeId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function findFirstPageNode(nodes: DocumentationNode[]): DocumentationNode | null {
  for (const node of nodes) {
    if (node.kind === "page") {
      return node;
    }

    const nestedPage = findFirstPageNode(node.children);
    if (nestedPage) {
      return nestedPage;
    }
  }

  return null;
}

function countDocumentationNodes(nodes: DocumentationNode[]): number {
  return nodes.reduce(
    (count, node) => count + 1 + (node.kind === "directory" ? countDocumentationNodes(node.children) : 0),
    0,
  );
}

function formatSprintDate(value: string | null) {
  if (!value) {
    return "In progress";
  }

  return new Date(value.replace(" ", "T")).toLocaleDateString();
}

function sortBacklogTaskRows(rows: BacklogTaskRow[], sort: BacklogSort) {
  const taskStatusOrder: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 1,
    done: 2,
  };

  return [...rows].sort((left, right) => {
    if (sort === "title") {
      return left.task.title.localeCompare(right.task.title) || left.epic.title.localeCompare(right.epic.title);
    }

    if (sort === "epic") {
      return left.epic.title.localeCompare(right.epic.title) || left.task.position - right.task.position;
    }

    if (sort === "status") {
      const statusDifference = taskStatusOrder[left.task.status] - taskStatusOrder[right.task.status];
      if (statusDifference !== 0) {
        return statusDifference;
      }

      return left.epic.title.localeCompare(right.epic.title) || left.task.position - right.task.position;
    }

    return (
      left.epic.position - right.epic.position ||
      left.task.position - right.task.position ||
      left.task.createdAt.localeCompare(right.task.createdAt)
    );
  });
}

function findTaskRecord(epics: Epic[], taskId: string | null) {
  if (!taskId) {
    return null;
  }

  for (const epic of epics) {
    const task = epic.tasks.find((candidate) => candidate.id === taskId);
    if (task) {
      return { epic, task };
    }
  }

  return null;
}

function ProjectPage() {
  const { projectSlug } = Route.useParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [epicTitle, setEpicTitle] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [documentationDirectoryName, setDocumentationDirectoryName] = useState("");
  const [documentationPageName, setDocumentationPageName] = useState("");
  const [selectedDocumentationNodeId, setSelectedDocumentationNodeId] = useState<string | null>(null);
  const [selectedDocumentationName, setSelectedDocumentationName] = useState("");
  const [selectedDocumentationContent, setSelectedDocumentationContent] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEpicId, setNewTaskEpicId] = useState("");
  const [retrospectiveNotesDraft, setRetrospectiveNotesDraft] = useState("");
  const [backlogSearch, setBacklogSearch] = useState("");
  const [backlogEpicFilter, setBacklogEpicFilter] = useState("all");
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [backlogSort, setBacklogSort] = useState<BacklogSort>("backlog");
  const [isSprintHistoryExpanded, setIsSprintHistoryExpanded] = useState(false);
  const [visibleSprintHistoryCount, setVisibleSprintHistoryCount] = useState(2);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [view, setView] = useState<ProjectView>("backlog");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isLoading || isMutating;

  async function loadBoard() {
    const data = await fetchBoard(projectSlug);
    setBoard(data);
  }

  async function loadDocumentation() {
    const data = await fetchDocumentation(projectSlug);
    setDocumentation(data);
  }

  async function loadProject() {
    setIsLoading(true);

    try {
      const [boardData, documentationData] = await Promise.all([
        fetchBoard(projectSlug),
        fetchDocumentation(projectSlug),
      ]);

      setBoard(boardData);
      setDocumentation(documentationData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
  }, [projectSlug]);

  const selectedDocumentationNode = findDocumentationNode(
    documentation?.nodes ?? [],
    selectedDocumentationNodeId,
  );
  const selectedDocumentationParent = selectedDocumentationNode?.parentId
    ? findDocumentationNode(documentation?.nodes ?? [], selectedDocumentationNode.parentId)
    : null;
  const selectedPage =
    selectedDocumentationNode?.kind === "page" ? selectedDocumentationNode : null;
  const selectedDirectory =
    selectedDocumentationNode?.kind === "directory" ? selectedDocumentationNode : null;
  const activeDocumentationDirectory = selectedDirectory ?? selectedDocumentationParent;
  const selectedTaskRecord = findTaskRecord(board?.epics ?? [], selectedTaskId);

  useEffect(() => {
    if (!documentation) {
      return;
    }

    const currentSelection = findDocumentationNode(documentation.nodes, selectedDocumentationNodeId);
    if (currentSelection) {
      return;
    }

    const defaultSelection =
      findFirstPageNode(documentation.nodes) ?? documentation.nodes[0] ?? null;
    setSelectedDocumentationNodeId(defaultSelection?.id ?? null);
  }, [documentation, selectedDocumentationNodeId]);

  useEffect(() => {
    if (!selectedDocumentationNode) {
      setSelectedDocumentationName("");
      setSelectedDocumentationContent("");
      return;
    }

    setSelectedDocumentationName(selectedDocumentationNode.name);
    setSelectedDocumentationContent(
      selectedDocumentationNode.kind === "page" ? selectedDocumentationNode.content : "",
    );
  }, [
    selectedDocumentationNode?.id,
    selectedDocumentationNode?.name,
    selectedDocumentationNode?.content,
    selectedDocumentationNode?.kind,
  ]);

  useEffect(() => {
    setRetrospectiveNotesDraft(board?.activeSprint?.retrospectiveNotes ?? "");
  }, [board?.activeSprint?.id, board?.activeSprint?.retrospectiveNotes]);

  useEffect(() => {
    if (selectedTaskId && !selectedTaskRecord) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, selectedTaskRecord]);

  useEffect(() => {
    const epicIds = new Set((board?.epics ?? []).map((epic) => epic.id));

    if (!newTaskEpicId && board?.epics[0]) {
      setNewTaskEpicId(board.epics[0].id);
    } else if (newTaskEpicId && !epicIds.has(newTaskEpicId)) {
      setNewTaskEpicId(board?.epics[0]?.id ?? "");
    }

    if (backlogEpicFilter !== "all" && !epicIds.has(backlogEpicFilter)) {
      setBacklogEpicFilter("all");
    }
  }, [board?.epics, backlogEpicFilter, newTaskEpicId]);

  async function runMutation(action: () => Promise<void>, fallbackMessage: string) {
    setIsMutating(true);

    try {
      await action();
      setError(null);
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : fallbackMessage);
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCreateEpic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!epicTitle.trim()) {
      return;
    }

    await runMutation(async () => {
      await createEpic(projectSlug, epicTitle);
      setEpicTitle("");
      await loadBoard();
    }, "Failed to create epic");
  }

  async function handleCreateTaskFromBacklog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTaskEpicId || !newTaskTitle.trim()) {
      return;
    }

    const epicId = newTaskEpicId;
    await runMutation(async () => {
      await createTask(projectSlug, epicId, newTaskTitle);
      setNewTaskTitle("");
      await loadBoard();
    }, "Failed to create task");
  }

  async function handleStartSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sprintName.trim()) {
      return;
    }

    await runMutation(async () => {
      await startSprint(projectSlug, sprintName);
      setSprintName("");
      await loadBoard();
    }, "Failed to start sprint");
  }

  async function handleCompleteSprint() {
    await runMutation(async () => {
      if (board?.activeSprint) {
        await updateSprintRetrospectiveNotes(
          projectSlug,
          board.activeSprint.id,
          retrospectiveNotesDraft,
        );
      }
      await completeActiveSprint(projectSlug);
      await loadBoard();
    }, "Failed to complete sprint");
  }

  async function handleSaveRetrospectiveNotes() {
    if (!board?.activeSprint) {
      return;
    }

    const sprintId = board.activeSprint.id;

    await runMutation(async () => {
      await updateSprintRetrospectiveNotes(
        projectSlug,
        sprintId,
        retrospectiveNotesDraft,
      );
      await loadBoard();
    }, "Failed to save retrospective notes");
  }

  async function handleAddTaskToSprint(taskId: string) {
    await runMutation(async () => {
      await addTaskToSprint(projectSlug, taskId);
      await loadBoard();
    }, "Failed to add task to sprint");
  }

  async function handleRemoveTaskFromSprint(taskId: string) {
    await runMutation(async () => {
      await removeTaskFromSprint(projectSlug, taskId);
      await loadBoard();
    }, "Failed to remove task from sprint");
  }

  async function handleMoveEpic(epicId: string, direction: "up" | "down") {
    await runMutation(async () => {
      await moveEpic(projectSlug, epicId, direction);
      await loadBoard();
    }, "Failed to reorder epic");
  }

  async function handleMoveTask(taskId: string, direction: "up" | "down") {
    await runMutation(async () => {
      await moveTask(projectSlug, taskId, direction);
      await loadBoard();
    }, "Failed to reorder task");
  }

  async function handleUpdateSprintTaskStatus(task: SprintTask, status: TaskStatus) {
    await runMutation(async () => {
      await updateTaskStatus(projectSlug, task.id, {
        title: task.title,
        description: task.description,
        status,
      });
      await loadBoard();
    }, "Failed to update task status");
  }

  function requestEpicDeletion(epicId: string) {
    const epic = board?.epics.find((candidate) => candidate.id === epicId);
    if (!epic) {
      return;
    }

    setConfirmDialog({
      title: `Delete "${epic.title}"?`,
      message: `This will permanently remove the epic and its ${epic.tasks.length} task${
        epic.tasks.length === 1 ? "" : "s"
      }.`,
      confirmLabel: "Delete epic",
      onConfirm: () =>
        runMutation(async () => {
          if (selectedTaskRecord?.epic.id === epicId) {
            setSelectedTaskId(null);
          }
          await deleteEpic(projectSlug, epicId);
          await loadBoard();
        }, "Failed to delete epic"),
    });
  }

  async function handleUpdateTaskDetails(
    taskId: string,
    input: { title: string; description?: string; status?: TaskStatus },
  ) {
    await runMutation(async () => {
      await updateTask(projectSlug, taskId, input);
      await loadBoard();
    }, "Failed to update task");
  }

  function requestTaskDeletion(taskId: string) {
    const taskRecord = findTaskRecord(board?.epics ?? [], taskId);
    if (!taskRecord) {
      return;
    }

    setConfirmDialog({
      title: `Delete "${taskRecord.task.title}"?`,
      message: `This will permanently remove the task from "${taskRecord.epic.title}" and from the active sprint if it is assigned there.`,
      confirmLabel: "Delete task",
      onConfirm: () =>
        runMutation(async () => {
          if (selectedTaskId === taskId) {
            setSelectedTaskId(null);
          }
          await deleteTask(projectSlug, taskId);
          await loadBoard();
        }, "Failed to delete task"),
    });
  }

  async function handleCreateDocumentationDirectory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentationDirectoryName.trim()) {
      return;
    }

    await runMutation(async () => {
      const response = (await createDocumentationNode(projectSlug, {
        kind: "directory",
        parentId: activeDocumentationDirectory?.id ?? null,
        name: documentationDirectoryName,
      })) as { node: DocumentationNode };

      setDocumentationDirectoryName("");
      await loadDocumentation();
      setSelectedDocumentationNodeId(response.node.id);
    }, "Failed to create documentation directory");
  }

  async function handleCreateDocumentationPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentationPageName.trim()) {
      return;
    }

    await runMutation(async () => {
      const response = (await createDocumentationNode(projectSlug, {
        kind: "page",
        parentId: activeDocumentationDirectory?.id ?? null,
        name: documentationPageName,
        content: "",
      })) as { node: DocumentationNode };

      setDocumentationPageName("");
      await loadDocumentation();
      setSelectedDocumentationNodeId(response.node.id);
    }, "Failed to create documentation page");
  }

  async function handleSaveDocumentationNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocumentationNode) {
      return;
    }

    await runMutation(async () => {
      await updateDocumentationNode(projectSlug, selectedDocumentationNode.id, {
        name: selectedDocumentationName,
        content: selectedDocumentationNode.kind === "page" ? selectedDocumentationContent : undefined,
      });
      await loadDocumentation();
    }, "Failed to save documentation");
  }

  function requestDocumentationDeletion() {
    if (!selectedDocumentationNode) {
      return;
    }

    const nodeId = selectedDocumentationNode.id;
    const childCount = selectedDocumentationNode.kind === "directory" ? selectedDocumentationNode.children.length : 0;

    setConfirmDialog({
      title: `Delete "${selectedDocumentationNode.name}"?`,
      message:
        selectedDocumentationNode.kind === "directory"
          ? `This will remove the directory and its ${childCount} direct child item${
              childCount === 1 ? "" : "s"
            }.`
          : "This will permanently remove the markdown page from the project documentation.",
      confirmLabel:
        selectedDocumentationNode.kind === "directory" ? "Delete directory" : "Delete page",
      onConfirm: () =>
        runMutation(async () => {
          setSelectedDocumentationNodeId(null);
          await deleteDocumentationNode(projectSlug, nodeId);
          await loadDocumentation();
        }, "Failed to delete documentation"),
    });
  }

  async function handleConfirmDialog() {
    if (!confirmDialog) {
      return;
    }

    const shouldClose = await confirmDialog.onConfirm();
    if (shouldClose) {
      setConfirmDialog(null);
    }
  }

  function renderDocumentationTree(nodes: DocumentationNode[], depth = 0): ReactNode[] {
    return nodes.flatMap((node) => [
      <button
        aria-pressed={selectedDocumentationNodeId === node.id}
        className={`doc-tree-node${selectedDocumentationNodeId === node.id ? " active" : ""}`}
        key={node.id}
        onClick={() => setSelectedDocumentationNodeId(node.id)}
        style={{ paddingLeft: `${1 + depth * 1.1}rem` }}
        type="button"
      >
        <span className="doc-tree-icon">{node.kind === "directory" ? "Dir" : "MD"}</span>
        <span>{node.name}</span>
      </button>,
      ...(node.kind === "directory" ? renderDocumentationTree(node.children, depth + 1) : []),
    ]);
  }

  const boardColumns: Array<{
    key: TaskStatus;
    title: string;
    tasks: SprintTask[];
  }> = [
    {
      key: "todo",
      title: "To-do",
      tasks: board?.sprintTasks.filter((task) => task.status === "todo") ?? [],
    },
    {
      key: "in_progress",
      title: "In progress",
      tasks: board?.sprintTasks.filter((task) => task.status === "in_progress") ?? [],
    },
    {
      key: "done",
      title: "Done",
      tasks: board?.sprintTasks.filter((task) => task.status === "done") ?? [],
    },
  ];

  const backlogSearchQuery = backlogSearch.trim().toLowerCase();
  const activeSprintId = board?.activeSprint?.id ?? null;
  const filteredBacklogTasks = sortBacklogTaskRows(
    (board?.epics ?? [])
      .flatMap((epic) =>
        epic.tasks.map((task) => ({
          epic,
          task,
        })),
      )
      .filter(({ epic, task }) => {
        if (!showCompletedTasks && task.status === "done") {
          return false;
        }

        if (backlogEpicFilter !== "all" && epic.id !== backlogEpicFilter) {
          return false;
        }

        if (!backlogSearchQuery) {
          return true;
        }

        return `${task.title} ${task.description} ${epic.title} ${epic.description}`
          .toLowerCase()
          .includes(backlogSearchQuery);
      }),
    backlogSort,
  );

  const visibleBacklogTaskCount = filteredBacklogTasks.length;
  const completedSprintCount = board?.sprintHistory.length ?? 0;
  const activeSprintTaskCount = board?.sprintTasks.length ?? 0;
  const hiddenCompletedTaskCount =
    board?.epics.reduce(
      (count, epic) => count + epic.tasks.filter((task) => task.status === "done").length,
      0,
    ) ?? 0;

  return (
    <div className="page-shell">
      <header className="panel masthead">
        <div className="stack gap-sm">
          <Link className="back-link" to="/">
            Back to projects
          </Link>
          <p className="eyebrow">Project Database</p>
          <h1>{board?.project.name ?? documentation?.project.name ?? projectSlug}</h1>
          <p className="lead">
            This project is stored in its own SQLite file and keeps delivery work plus product
            documentation in one local system.
          </p>
        </div>

        {board ? (
          <div className="hero-stats">
            <div>
              <strong>{board.epics.length}</strong>
              <span>Epics</span>
            </div>
            <div>
              <strong>{board.epics.reduce((count, epic) => count + epic.tasks.length, 0)}</strong>
              <span>Tasks</span>
            </div>
            <div>
              <strong>{countDocumentationNodes(documentation?.nodes ?? [])}</strong>
              <span>Docs</span>
            </div>
          </div>
        ) : null}
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel view-switcher">
        <div className="tab-row" role="tablist" aria-label="Project views">
          <button
            aria-selected={view === "board"}
            className={`tab-button${view === "board" ? " active" : ""}`}
            onClick={() => setView("board")}
            role="tab"
            type="button"
          >
            Board
          </button>
          <button
            aria-selected={view === "backlog"}
            className={`tab-button${view === "backlog" ? " active" : ""}`}
            onClick={() => setView("backlog")}
            role="tab"
            type="button"
          >
            Backlog
          </button>
          <button
            aria-selected={view === "documentation"}
            className={`tab-button${view === "documentation" ? " active" : ""}`}
            onClick={() => setView("documentation")}
            role="tab"
            type="button"
          >
            Documentation
          </button>
        </div>
      </section>

      {view === "board" ? (
        <section className="panel sprint-panel">
          <div className="sprint-header">
            <div className="section-heading">
              <p className="eyebrow">Active Sprint Board</p>
              <h2>{board?.activeSprint?.name ?? "No active sprint"}</h2>
            </div>

            {board?.activeSprint ? (
              <button
                className="secondary-button"
                disabled={isBusy}
                onClick={handleCompleteSprint}
                type="button"
              >
                Complete sprint
              </button>
            ) : null}
          </div>

          {board?.activeSprint ? (
            <div className="board-grid">
              {boardColumns.map((column) => (
                <section className="board-column" key={column.key}>
                  <div className="board-column-header">
                    <h3>{column.title}</h3>
                    <span>{column.tasks.length}</span>
                  </div>

                  {column.tasks.length > 0 ? (
                    <div className="board-card-list">
                      {column.tasks.map((task) => (
                        <article className="board-card" key={task.id}>
                          <div className="stack gap-sm">
                            <div>
                              <p className="board-card-title">{task.title}</p>
                              <small className="muted">{task.epicTitle}</small>
                            </div>
                            <div className="status-actions">
                              {task.status !== "todo" ? (
                                <button
                                  className="ghost-button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdateSprintTaskStatus(task, "todo")}
                                  type="button"
                                >
                                  To-do
                                </button>
                              ) : null}
                              {task.status !== "in_progress" ? (
                                <button
                                  className="ghost-button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleUpdateSprintTaskStatus(task, "in_progress")
                                  }
                                  type="button"
                                >
                                  In progress
                                </button>
                              ) : null}
                              {task.status !== "done" ? (
                                <button
                                  className="ghost-button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdateSprintTaskStatus(task, "done")}
                                  type="button"
                                >
                                  Done
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state board-empty">
                      <h3>No tasks</h3>
                      <p>No sprint tasks are in this column yet.</p>
                    </div>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No active sprint</h3>
              <p>Start a sprint in the backlog view to populate the execution board.</p>
            </div>
          )}

        </section>
      ) : null}

      {view === "backlog" ? (
        <section className="backlog-layout">
          <aside className="backlog-sidebar">
            <section className="panel create-panel">
              <div className="section-heading">
                <p className="eyebrow">Backlog</p>
                <h2>{board?.project.slug ?? projectSlug}</h2>
              </div>

              <form className="create-form stack-on-mobile" onSubmit={handleCreateEpic}>
                <label className="field grow">
                  <span>New epic</span>
                  <input
                    onChange={(event) => setEpicTitle(event.target.value)}
                    placeholder="Checkout redesign"
                    value={epicTitle}
                  />
                </label>

                <button className="primary-button" disabled={isBusy} type="submit">
                  Add epic
                </button>
              </form>

              <form className="stack gap-sm" onSubmit={handleCreateTaskFromBacklog}>
                <label className="field">
                  <span>New task</span>
                  <input
                    onChange={(event) => setNewTaskTitle(event.target.value)}
                    placeholder="Clarify sprint entry criteria"
                    value={newTaskTitle}
                  />
                </label>

                <label className="field">
                  <span>Epic</span>
                  <select
                    onChange={(event) => setNewTaskEpicId(event.target.value)}
                    value={newTaskEpicId}
                  >
                    {(board?.epics ?? []).map((epic) => (
                      <option key={epic.id} value={epic.id}>
                        {epic.title}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="secondary-button" disabled={isBusy || !board?.epics.length} type="submit">
                  Add task
                </button>
              </form>
            </section>

            <section className="panel epic-directory-panel">
              <div className="section-heading">
                <p className="eyebrow">Epic Directory</p>
                <h2>Manage epic order</h2>
              </div>

              {(board?.epics ?? []).length ? (
                <div className="epic-directory-list">
                  {(board?.epics ?? []).map((epic) => (
                    <article className="epic-directory-row" key={epic.id}>
                      <div>
                        <p className="epic-directory-title">{epic.title}</p>
                        <small className="muted">
                          {epic.tasks.length} task{epic.tasks.length === 1 ? "" : "s"}
                        </small>
                      </div>

                      <div className="inline-actions wrap-actions">
                        <button disabled={isBusy} onClick={() => handleMoveEpic(epic.id, "up")} type="button">
                          Up
                        </button>
                        <button disabled={isBusy} onClick={() => handleMoveEpic(epic.id, "down")} type="button">
                          Down
                        </button>
                        <button
                          className="danger-inline-button"
                          disabled={isBusy}
                          onClick={() => requestEpicDeletion(epic.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">Create an epic before adding tasks to the list.</p>
              )}
            </section>

            <section className="panel sprint-panel">
              <div className="sprint-header">
                <div className="section-heading">
                  <p className="eyebrow">Sprint Planning</p>
                  <h2>{board?.activeSprint?.name ?? "Start a new sprint"}</h2>
                </div>

                {board?.activeSprint ? (
                  <button
                    className="secondary-button"
                    disabled={isBusy}
                    onClick={handleCompleteSprint}
                    type="button"
                  >
                    Complete sprint
                  </button>
                ) : null}
              </div>

              {board?.activeSprint ? (
                <div className="stack gap-sm">
                  <p className="muted">
                    {board.sprintTasks.length} task{board.sprintTasks.length === 1 ? "" : "s"} currently
                    selected for the active sprint.
                  </p>
                  {board.sprintTasks.length > 0 ? (
                    <ul className="sprint-task-list">
                      {board.sprintTasks.map((task) => (
                        <li className="sprint-task-row" key={task.id}>
                          <div>
                            <p>{task.title}</p>
                            <small className="muted">{task.epicTitle}</small>
                          </div>
                          <button
                            className="ghost-button"
                            disabled={isBusy}
                            onClick={() => handleRemoveTaskFromSprint(task.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">This sprint has no tasks yet. Add them from the backlog workspace.</p>
                  )}

                  <div className="retrospective-card">
                    <label className="field">
                      <span>Retrospective notes</span>
                      <textarea
                        className="inline-textarea"
                        onChange={(event) => setRetrospectiveNotesDraft(event.target.value)}
                        placeholder="What worked well, what should change, and what this sprint delivered."
                        value={retrospectiveNotesDraft}
                      />
                    </label>
                    <div className="inline-actions wrap-actions">
                      <button
                        className="secondary-button"
                        disabled={isBusy}
                        onClick={handleSaveRetrospectiveNotes}
                        type="button"
                      >
                        Save notes
                      </button>
                      <small className="muted">
                        Notes are preserved in sprint history when the sprint is completed.
                      </small>
                    </div>
                  </div>
                </div>
              ) : (
                <form className="create-form stack-on-mobile" onSubmit={handleStartSprint}>
                  <label className="field grow">
                    <span>Sprint name</span>
                    <input
                      onChange={(event) => setSprintName(event.target.value)}
                      placeholder="Sprint 1"
                      value={sprintName}
                    />
                  </label>

                  <button className="primary-button" disabled={isBusy} type="submit">
                    Start sprint
                  </button>
                </form>
              )}
            </section>

            <section className="panel sprint-history-panel">
              <div className="sprint-history-summary">
                <div className="section-heading">
                  <p className="eyebrow">Sprint History</p>
                  <h2>{board?.sprintHistory.length ? "Past sprint notes" : "No completed sprints yet"}</h2>
                </div>

                {board?.sprintHistory.length ? (
                  <button
                    className="ghost-button"
                    disabled={isBusy}
                    onClick={() => {
                      setIsSprintHistoryExpanded((current) => {
                        const next = !current;
                        if (next) {
                          setVisibleSprintHistoryCount(2);
                        }
                        return next;
                      });
                    }}
                    type="button"
                  >
                    {isSprintHistoryExpanded ? "Hide history" : "Show history"}
                  </button>
                ) : null}
              </div>

              {board?.sprintHistory.length ? (
                isSprintHistoryExpanded ? (
                  <div className="sprint-history-list">
                    {board.sprintHistory.slice(0, visibleSprintHistoryCount).map((sprint) => (
                      <article className="sprint-history-card" key={sprint.id}>
                        <div className="sprint-history-header">
                          <div>
                            <h3>{sprint.name}</h3>
                            <p className="muted">
                              Completed {formatSprintDate(sprint.completedAt)} · {sprint.completedTasks}/
                              {sprint.totalTasks} tasks done
                            </p>
                          </div>
                        </div>
                        <p className="history-notes">
                          {sprint.retrospectiveNotes ||
                            "No retrospective notes were captured for this sprint."}
                        </p>
                      </article>
                    ))}

                    {visibleSprintHistoryCount < board.sprintHistory.length ? (
                      <button
                        className="secondary-button"
                        disabled={isBusy}
                        onClick={() =>
                          setVisibleSprintHistoryCount((count) =>
                            Math.min(count + 2, board.sprintHistory.length),
                          )
                        }
                        type="button"
                      >
                        Load more
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="muted">
                    Sprint history stays collapsed by default so planning controls keep the focus.
                  </p>
                )
              ) : (
                <div className="empty-state">
                  <h3>No sprint history yet</h3>
                  <p>Complete a sprint to preserve its notes and delivery snapshot here.</p>
                </div>
              )}
            </section>
          </aside>

          <div className="backlog-main">
            <section className="panel backlog-overview-panel">
              <div className="section-heading">
                <p className="eyebrow">Backlog Workspace</p>
                <h2>Plan work from one task list</h2>
              </div>

              <div className="backlog-summary-grid">
                <article className="backlog-summary-card">
                  <strong>{visibleBacklogTaskCount}</strong>
                  <span>Visible tasks</span>
                </article>
                <article className="backlog-summary-card">
                  <strong>{activeSprintTaskCount}</strong>
                  <span>In active sprint</span>
                </article>
                <article className="backlog-summary-card">
                  <strong>{completedSprintCount}</strong>
                  <span>Completed sprints</span>
                </article>
              </div>

              <p className="lead backlog-overview-copy">
                Filter and order tasks directly above the list, open a task for full editing, and
                keep epic context visible on every row.
              </p>
            </section>

            <section className="panel backlog-toolbar backlog-list-controls">
              <div className="section-heading">
                <p className="eyebrow">List Controls</p>
                <h2>{visibleBacklogTaskCount} visible tasks</h2>
              </div>

              <div className="backlog-controls backlog-controls-compact">
                <label className="field grow">
                  <span>Search tasks</span>
                  <input
                    onChange={(event) => setBacklogSearch(event.target.value)}
                    placeholder="Search titles, descriptions, and epics"
                    value={backlogSearch}
                  />
                </label>

                <label className="field backlog-select-field">
                  <span>Epic</span>
                  <select
                    className="backlog-select"
                    onChange={(event) => setBacklogEpicFilter(event.target.value)}
                    value={backlogEpicFilter}
                  >
                    <option value="all">All epics</option>
                    {(board?.epics ?? []).map((epic) => (
                      <option key={epic.id} value={epic.id}>
                        {epic.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field backlog-select-field">
                  <span>Order by</span>
                  <select
                    className="backlog-select"
                    onChange={(event) => setBacklogSort(event.target.value as BacklogSort)}
                    value={backlogSort}
                  >
                    <option value="backlog">Backlog order</option>
                    <option value="title">Task name</option>
                    <option value="epic">Epic</option>
                    <option value="status">Status</option>
                  </select>
                </label>
              </div>

              <label className="checkbox-row">
                <input
                  checked={showCompletedTasks}
                  onChange={(event) => setShowCompletedTasks(event.target.checked)}
                  type="checkbox"
                />
                <span>Show completed tasks in backlog</span>
              </label>

              {!showCompletedTasks && hiddenCompletedTaskCount > 0 ? (
                <p className="muted">
                  {hiddenCompletedTaskCount} completed task{hiddenCompletedTaskCount === 1 ? "" : "s"} hidden
                  to keep the list focused.
                </p>
              ) : null}
            </section>

            <section className="panel backlog-workspace-panel">
              {filteredBacklogTasks.length ? (
                <div className="backlog-task-list">
                  {filteredBacklogTasks.map(({ epic, task }) => (
                    <article className="backlog-task-row" key={task.id}>
                      <div className="backlog-task-copy">
                        <div className="backlog-task-heading">
                          <p className="backlog-task-title">{task.title}</p>
                          <span className="task-epic-tag">{epic.title}</span>
                        </div>
                        {task.description ? <p className="backlog-task-description">{task.description}</p> : null}
                        <div className="task-meta">
                          <span className={`status-badge status-${task.status}`}>
                            {task.status === "in_progress"
                              ? "In progress"
                              : task.status === "done"
                                ? "Done"
                                : "To-do"}
                          </span>
                          <small className="muted">Task {task.position + 1}</small>
                        </div>
                      </div>

                      <div className="inline-actions wrap-actions backlog-task-actions">
                        {activeSprintId ? (
                          task.sprintId === activeSprintId ? (
                            <button
                              disabled={isBusy}
                              onClick={() => handleRemoveTaskFromSprint(task.id)}
                              type="button"
                            >
                              Move to backlog
                            </button>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => handleAddTaskToSprint(task.id)}
                              type="button"
                            >
                              Add to sprint
                            </button>
                          )
                        ) : null}
                        <button disabled={isBusy} onClick={() => setSelectedTaskId(task.id)} type="button">
                          Open
                        </button>
                        <button disabled={isBusy} onClick={() => handleMoveTask(task.id, "up")} type="button">
                          Up
                        </button>
                        <button disabled={isBusy} onClick={() => handleMoveTask(task.id, "down")} type="button">
                          Down
                        </button>
                        <button
                          className="danger-inline-button"
                          disabled={isBusy}
                          onClick={() => requestTaskDeletion(task.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section className="panel empty-state">
                  <h3>
                    {isBusy
                      ? "Loading backlog..."
                      : board?.epics.length
                        ? "No tasks match the current filters"
                        : "No epics yet"}
                  </h3>
                  <p>
                    {isBusy
                      ? "Reading the project database."
                      : board?.epics.length
                        ? "Try widening the search or show completed tasks to bring more work back into view."
                        : "Create the first epic for this project, then add backlog tasks under it."}
                  </p>
                </section>
              )}
            </section>
          </div>
        </section>
      ) : null}

      {view === "documentation" ? (
        <section className="documentation-layout">
          <aside className="panel documentation-sidebar">
            <div className="section-heading">
              <p className="eyebrow">Documentation</p>
              <h2>{activeDocumentationDirectory?.path ?? "Root"}</h2>
            </div>

            <div className="doc-tree">
              {documentation?.nodes.length ? (
                renderDocumentationTree(documentation.nodes)
              ) : (
                <div className="empty-state compact-empty-state">
                  <h3>No pages yet</h3>
                  <p>Create the first directory or markdown page for this project.</p>
                </div>
              )}
            </div>

            <div className="doc-create-stack">
              <form className="doc-inline-form" onSubmit={handleCreateDocumentationDirectory}>
                <label className="field grow">
                  <span>New directory</span>
                  <input
                    onChange={(event) => setDocumentationDirectoryName(event.target.value)}
                    placeholder="architecture"
                    value={documentationDirectoryName}
                  />
                </label>
                <button className="secondary-button" disabled={isBusy} type="submit">
                  Add
                </button>
              </form>

              <form className="doc-inline-form" onSubmit={handleCreateDocumentationPage}>
                <label className="field grow">
                  <span>New page</span>
                  <input
                    onChange={(event) => setDocumentationPageName(event.target.value)}
                    placeholder="vision.md"
                    value={documentationPageName}
                  />
                </label>
                <button className="primary-button" disabled={isBusy} type="submit">
                  Add
                </button>
              </form>
            </div>
          </aside>

          <section className="panel documentation-editor">
            {selectedDocumentationNode ? (
              <form className="doc-editor-form" onSubmit={handleSaveDocumentationNode}>
                <div className="sprint-header">
                  <div className="section-heading">
                    <p className="eyebrow">
                      {selectedDocumentationNode.kind === "page" ? "Markdown Page" : "Directory"}
                    </p>
                    <h2>{selectedDocumentationNode.path}</h2>
                  </div>

                  <button
                    className="ghost-button danger-button"
                    disabled={isBusy}
                    onClick={requestDocumentationDeletion}
                    type="button"
                  >
                    Delete
                  </button>
                </div>

                <label className="field">
                  <span>Name</span>
                  <input
                    onChange={(event) => setSelectedDocumentationName(event.target.value)}
                    value={selectedDocumentationName}
                  />
                </label>

                {selectedPage ? (
                  <label className="field grow">
                    <span>Markdown</span>
                    <textarea
                      className="doc-textarea"
                      onChange={(event) => setSelectedDocumentationContent(event.target.value)}
                      placeholder="# Product vision"
                      value={selectedDocumentationContent}
                    />
                  </label>
                ) : (
                  <div className="doc-directory-panel">
                    <p className="muted">
                      Directories keep pages organized. Create subdirectories and markdown files from
                      the left-hand panel.
                    </p>
                  </div>
                )}

                <div className="doc-editor-footer">
                  <p className="muted">
                    {selectedPage
                      ? "Markdown is stored directly in this project's SQLite database."
                      : "Renaming a directory updates how its children are organized in the tree."}
                  </p>
                  <button className="primary-button" disabled={isBusy} type="submit">
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="empty-state doc-empty-state">
                <h3>Select a page or directory</h3>
                <p>Choose an entry from the documentation tree or create the first markdown page.</p>
              </div>
            )}
          </section>
        </section>
      ) : null}

      {selectedTaskRecord ? (
        <TaskDetailsDialog
          activeSprintId={activeSprintId}
          epicTitle={selectedTaskRecord.epic.title}
          isMutating={isBusy}
          onAddTaskToSprint={handleAddTaskToSprint}
          onClose={() => setSelectedTaskId(null)}
          onDeleteTask={() => requestTaskDeletion(selectedTaskRecord.task.id)}
          onMoveTask={handleMoveTask}
          onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
          onSaveTask={handleUpdateTaskDetails}
          task={selectedTaskRecord.task}
        />
      ) : null}

      {confirmDialog ? (
        <ConfirmationDialog
          confirmLabel={confirmDialog.confirmLabel}
          isBusy={isBusy}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={handleConfirmDialog}
          title={confirmDialog.title}
        />
      ) : null}
    </div>
  );
}
