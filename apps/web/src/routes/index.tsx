import { FormEvent, useEffect, useState } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { createProject, fetchProjects } from "../api";
import { AppShell, type ShellNavSection } from "../components/AppShell";
import {
  CommandPalette,
  type CommandAction,
} from "../components/CommandPalette";
import { Icon } from "../components/icons";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
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
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function loadProjects() {
    setIsLoading(true);

    try {
      const data = await fetchProjects();
      setProjects(data.projects);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load projects",
      );
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
      const { project } = await createProject(projectName.trim());
      setProjectName("");
      setIsCreateOpen(false);
      await loadProjects();
      await navigate({
        to: "/projects/$projectSlug",
        params: { projectSlug: project.slug },
        search: { view: "overview" },
      });
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create project",
      );
    } finally {
      setIsCreating(false);
    }
  }

  const navSections: ShellNavSection[] = [
    {
      label: "Workspace",
      items: [
        { id: "home", label: "Projects", icon: "home", active: true },
        {
          id: "create",
          label: "Create project",
          icon: "projects",
          onClick: () => setIsCreateOpen(true),
        },
      ],
    },
  ];

  const commandActions: CommandAction[] = [
    {
      id: "create-project",
      label: "Create project",
      hint: "Start a new workspace",
      icon: "plus",
      onSelect: () => setIsCreateOpen(true),
    },
    ...projects.map((project) => ({
      id: `project-${project.slug}`,
      label: project.name,
      hint: `Open /${project.slug}`,
      icon: "projects" as const,
      keywords: `${project.slug}`,
      onSelect: () =>
        void navigate({
          to: "/projects/$projectSlug",
          params: { projectSlug: project.slug },
          search: { view: "overview" },
        }),
    })),
  ];

  return (
    <>
      <AppShell
        commandLabel="Jump to a project"
        navSections={navSections}
        onCommandClick={() => setIsCommandOpen(true)}
        onQuickCreate={() => setIsCreateOpen(true)}
        pageHeader={
          <div className="page-header">
            <div>
              <p className="section-kicker">Projects</p>
              <h1>Choose a workspace.</h1>
              <p className="section-subtitle">
                Each project keeps backlog, sprint board, history, and
                documentation in one interface.
              </p>
            </div>
          </div>
        }
        sidebarMeta={
          <div className="sidebar-note">
            <p>Available today</p>
            <small>
              Projects, epics, tasks, sprint planning, sprint board, sprint
              history, and docs.
            </small>
          </div>
        }
        topbarMeta={
          <Button
            className="icon-button"
            onClick={() => setIsCommandOpen(true)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Icon name="search" />
          </Button>
        }
      >
        <section className="panel-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Workspaces</p>
              <h2>Open a project</h2>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              type="button"
            >
              Create project
            </Button>
          </div>

          {isLoading ? (
            <div className="skeleton-grid">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : projects.length ? (
            <div className="project-card-grid">
              {projects.map((project) => (
                <button
                  className="workspace-card"
                  key={project.slug}
                  onClick={() =>
                    void navigate({
                      to: "/projects/$projectSlug",
                      params: { projectSlug: project.slug },
                      search: { view: "overview" },
                    })
                  }
                  type="button"
                >
                  <div className="workspace-card-header">
                    <div>
                      <p className="section-kicker">/{project.slug}</p>
                      <h3>{project.name}</h3>
                    </div>
                  </div>
                  <div className="metric-row">
                    <span>Epics</span>
                    <strong>{project.epicCount}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Tasks</span>
                    <strong>{project.taskCount}</strong>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-placeholder">
              <h3>No projects yet</h3>
              <p>
                Create your first workspace to start managing epics, tasks,
                sprints, and docs.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                type="button"
              >
                Create project
              </Button>
            </div>
          )}

          {error ? <div className="inline-banner danger">{error}</div> : null}
        </section>
      </AppShell>

      <CommandPalette
        actions={commandActions}
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />

      {isCreateOpen ? (
        <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
          <DialogContent className="confirmation-modal create-modal">
            <DialogHeader className="detail-section-heading">
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription className="section-subtitle">
                Start a new workspace for product work and documentation.
              </DialogDescription>
            </DialogHeader>
            <form className="stack-form" onSubmit={handleCreateProject}>
              <label className="field">
                <span>Project name</span>
                <Input
                  autoFocus
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Platform redesign"
                  value={projectName}
                />
              </label>
              <DialogFooter className="toolbar-actions">
                <Button
                  onClick={() => setIsCreateOpen(false)}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? "Creating..." : "Create project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
