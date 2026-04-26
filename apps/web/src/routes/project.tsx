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
  updateEpic,
  updateDocumentationNode,
  updateTask,
  updateTaskStatus,
} from "../api";
import { EpicCard } from "../components/EpicCard";
import type { Board, Documentation, DocumentationNode, SprintTask, TaskStatus } from "../types";
import { Route as RootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/projects/$projectSlug",
  component: ProjectPage,
});

type ProjectView = "board" | "backlog" | "documentation";

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

  async function runMutation(action: () => Promise<void>, fallbackMessage: string) {
    setIsMutating(true);

    try {
      await action();
      setError(null);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : fallbackMessage);
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

  async function handleCreateTask(epicId: string, title: string) {
    await runMutation(async () => {
      await createTask(projectSlug, epicId, title);
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
      await completeActiveSprint(projectSlug);
      await loadBoard();
    }, "Failed to complete sprint");
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

  async function handleUpdateEpicDetails(
    epicId: string,
    input: { title: string; description?: string },
  ) {
    await runMutation(async () => {
      await updateEpic(projectSlug, epicId, input);
      await loadBoard();
    }, "Failed to update epic");
  }

  async function handleDeleteEpic(epicId: string) {
    await runMutation(async () => {
      await deleteEpic(projectSlug, epicId);
      await loadBoard();
    }, "Failed to delete epic");
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

  async function handleDeleteTask(taskId: string) {
    await runMutation(async () => {
      await deleteTask(projectSlug, taskId);
      await loadBoard();
    }, "Failed to delete task");
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

  async function handleDeleteDocumentationNode() {
    if (!selectedDocumentationNode) {
      return;
    }

    await runMutation(async () => {
      const nodeId = selectedDocumentationNode.id;
      setSelectedDocumentationNodeId(null);
      await deleteDocumentationNode(projectSlug, nodeId);
      await loadDocumentation();
    }, "Failed to delete documentation");
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
        <>
          <section className="panel create-panel">
            <div className="section-heading">
              <p className="eyebrow">Backlog</p>
              <h2>{board?.project.slug ?? projectSlug}</h2>
            </div>

            <form className="create-form" onSubmit={handleCreateEpic}>
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
                  <p className="muted">This sprint has no tasks yet. Add them from the backlog below.</p>
                )}
              </div>
            ) : (
              <form className="create-form" onSubmit={handleStartSprint}>
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

          <section className="epic-grid">
            {board?.epics.length ? (
              board.epics.map((epic) => (
                <EpicCard
                  activeSprintId={board.activeSprint?.id ?? null}
                  epic={epic}
                  isMutating={isBusy}
                  key={epic.id}
                  onAddTaskToSprint={handleAddTaskToSprint}
                  onCreateTask={handleCreateTask}
                  onDeleteEpic={handleDeleteEpic}
                  onDeleteTask={handleDeleteTask}
                  onMoveEpic={handleMoveEpic}
                  onMoveTask={handleMoveTask}
                  onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
                  onUpdateEpic={handleUpdateEpicDetails}
                  onUpdateTask={handleUpdateTaskDetails}
                />
              ))
            ) : (
              <section className="panel empty-state">
                <h3>{isBusy ? "Loading backlog..." : "No epics yet"}</h3>
                <p>
                  {isBusy
                    ? "Reading the project database."
                    : "Create the first epic for this project, then add backlog tasks under it."}
                </p>
              </section>
            )}
          </section>
        </>
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
                    onClick={handleDeleteDocumentationNode}
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
    </div>
  );
}
