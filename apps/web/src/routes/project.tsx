import { FormEvent, useEffect, useState } from "react";
import { Link, createRoute } from "@tanstack/react-router";
import {
  addTaskToSprint,
  completeActiveSprint,
  createEpic,
  createTask,
  fetchBoard,
  moveEpic,
  moveTask,
  removeTaskFromSprint,
  startSprint,
  updateTaskStatus,
} from "../api";
import { EpicCard } from "../components/EpicCard";
import type { Board, SprintTask, TaskStatus } from "../types";
import { Route as RootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/projects/$projectSlug",
  component: ProjectPage,
});

function ProjectPage() {
  const { projectSlug } = Route.useParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [epicTitle, setEpicTitle] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [view, setView] = useState<"board" | "backlog">("backlog");
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBoard() {
    setIsBusy(true);

    try {
      const data = await fetchBoard(projectSlug);
      setBoard(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load project");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void loadBoard();
  }, [projectSlug]);

  async function handleCreateEpic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!epicTitle.trim()) {
      return;
    }

    setIsBusy(true);

    try {
      await createEpic(projectSlug, epicTitle);
      setEpicTitle("");
      await loadBoard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create epic");
      setIsBusy(false);
    }
  }

  async function handleCreateTask(epicId: string, title: string) {
    setIsBusy(true);

    try {
      await createTask(projectSlug, epicId, title);
      await loadBoard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create task");
      setIsBusy(false);
    }
  }

  async function handleStartSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sprintName.trim()) {
      return;
    }

    setIsBusy(true);

    try {
      await startSprint(projectSlug, sprintName);
      setSprintName("");
      await loadBoard();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Failed to start sprint");
      setIsBusy(false);
    }
  }

  async function handleCompleteSprint() {
    setIsBusy(true);

    try {
      await completeActiveSprint(projectSlug);
      await loadBoard();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Failed to complete sprint");
      setIsBusy(false);
    }
  }

  async function handleAddTaskToSprint(taskId: string) {
    setIsBusy(true);

    try {
      await addTaskToSprint(projectSlug, taskId);
      await loadBoard();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to add task to sprint");
      setIsBusy(false);
    }
  }

  async function handleRemoveTaskFromSprint(taskId: string) {
    setIsBusy(true);

    try {
      await removeTaskFromSprint(projectSlug, taskId);
      await loadBoard();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove task from sprint");
      setIsBusy(false);
    }
  }

  async function handleMoveEpic(epicId: string, direction: "up" | "down") {
    setIsBusy(true);

    try {
      await moveEpic(projectSlug, epicId, direction);
      await loadBoard();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Failed to reorder epic");
      setIsBusy(false);
    }
  }

  async function handleMoveTask(taskId: string, direction: "up" | "down") {
    setIsBusy(true);

    try {
      await moveTask(projectSlug, taskId, direction);
      await loadBoard();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Failed to reorder task");
      setIsBusy(false);
    }
  }

  async function handleUpdateSprintTaskStatus(task: SprintTask, status: TaskStatus) {
    setIsBusy(true);

    try {
      await updateTaskStatus(projectSlug, task.id, {
        title: task.title,
        description: task.description,
        status,
      });
      await loadBoard();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update task status");
      setIsBusy(false);
    }
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
          <h1>{board?.project.name ?? projectSlug}</h1>
          <p className="lead">
            This project is stored in its own SQLite file and manages its epics and tasks locally.
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
        </div>
      </section>

      {view === "board" ? (
        <>
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
                                    onClick={() => handleUpdateSprintTaskStatus(task, "in_progress")}
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
        </>
      ) : (
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
                  onMoveEpic={handleMoveEpic}
                  onMoveTask={handleMoveTask}
                  onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
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
      )}
    </div>
  );
}
