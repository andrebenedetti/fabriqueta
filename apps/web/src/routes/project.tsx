import { FormEvent, useEffect, useState } from "react";
import { Link, createRoute } from "@tanstack/react-router";
import { createEpic, createTask, fetchBoard, moveEpic, moveTask } from "../api";
import { EpicCard } from "../components/EpicCard";
import type { Board } from "../types";
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

      <section className="panel create-panel">
        <div className="section-heading">
          <p className="eyebrow">Active Project</p>
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

      <section className="epic-grid">
        {board?.epics.length ? (
          board.epics.map((epic) => (
            <EpicCard
              epic={epic}
              isMutating={isBusy}
              key={epic.id}
              onCreateTask={handleCreateTask}
              onMoveEpic={handleMoveEpic}
              onMoveTask={handleMoveTask}
            />
          ))
        ) : (
          <section className="panel empty-state">
            <h3>{isBusy ? "Loading project..." : "No epics yet"}</h3>
            <p>
              {isBusy
                ? "Reading the project database."
                : "Create the first epic for this project, then add ordered tasks under it."}
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
