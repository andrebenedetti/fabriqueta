import { FormEvent, useEffect, useState } from "react";
import { Link, createRoute, useNavigate } from "@tanstack/react-router";
import { createProject, fetchProjects } from "../api";
import type { Project } from "../types";
import { Route as RootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: ProjectsHomePage,
});

function ProjectsHomePage() {
  const navigate = useNavigate({ from: "/" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    setIsLoading(true);

    try {
      const data = await fetchProjects();
      setProjects(data.projects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) {
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const { project } = await createProject(projectName);
      setProjectName("");
      await loadProjects();
      await navigate({
        to: "/projects/$projectSlug",
        params: { projectSlug: project.slug },
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="panel masthead">
        <div>
          <p className="eyebrow">Fabriqueta</p>
          <h1>Projects live as their own SQLite files.</h1>
          <p className="lead">
            Each project is self-contained. Fabriqueta manages itself, and any future project gets
            its own database file beside it.
          </p>
        </div>
      </header>

      <section className="panel create-panel">
        <div className="section-heading">
          <p className="eyebrow">Create Project</p>
          <h2>Start a new workspace</h2>
        </div>

        <form className="create-form" onSubmit={handleCreateProject}>
          <label className="field grow">
            <span>Project name</span>
            <input
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Inventory revamp"
              value={projectName}
            />
          </label>

          <button className="primary-button" disabled={isCreating} type="submit">
            {isCreating ? "Creating..." : "Create project"}
          </button>
        </form>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel list-panel">
        <div className="section-heading">
          <p className="eyebrow">Existing Projects</p>
          <h2>Choose a project</h2>
        </div>

        {isLoading ? (
          <p className="muted">Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>Create the first project to start managing epics and tasks.</p>
          </div>
        ) : (
          <div className="project-list">
            {projects.map((project) => (
              <Link
                className="project-card"
                key={project.slug}
                params={{ projectSlug: project.slug }}
                to="/projects/$projectSlug"
              >
                <div>
                  <p className="eyebrow">/{project.slug}.sqlite</p>
                  <h3>{project.name}</h3>
                </div>

                <div className="project-metrics">
                  <span>{project.epicCount} epics</span>
                  <span>{project.taskCount} tasks</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
