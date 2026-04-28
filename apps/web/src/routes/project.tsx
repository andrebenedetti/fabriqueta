import { useEffect, useState, useCallback, type FormEvent } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import {
  addTaskToSprint,
  completeActiveSprint,
  createDocumentationNode,
  createEpic,
  createTask,
  deleteDocumentationNode,
  deleteEpic,
  deleteTask,
  fetchActivityLog,
  fetchBoard,
  fetchDocumentation,
  removeTaskFromSprint,
  startSprint,
  updateDocumentationNode,
  updateSprintRetrospectiveNotes,
  updateTask,
  updateTaskStatus,
} from "../api";
import { AppShell, type ShellNavSection } from "../components/AppShell";
import { CommandPalette, type CommandAction } from "../components/CommandPalette";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { Icon } from "../components/icons";
import { TaskDetailsDialog } from "../components/TaskDetailsDialog";
import { ToastContainer } from "../components/ui/Toast";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { useStore, type ProjectView } from "../store";
import { OverviewView } from "../views/OverviewView";
import { BacklogView } from "../views/BacklogView";
import { PlanningView } from "../views/PlanningView";
import { BoardView } from "../views/BoardView";
import { DocumentationView } from "../views/DocumentationView";
import { findDocumentationNode, findFirstPageNode, countDocumentationNodes, type BacklogSort, type TaskStatus } from "../utils";
import type { Board, Documentation, Task } from "../types";
import { Route as RootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/projects/$projectSlug",
  validateSearch: (search: Record<string, unknown>) => ({
    view: (typeof search.view === "string" && ["overview", "backlog", "planning", "board", "docs"].includes(search.view) ? search.view : "overview") as ProjectView,
  }),
  component: ProjectPage,
});

type ConfirmDialogState = {
  confirmLabel: string;
  message: string;
  onConfirm: () => Promise<boolean>;
  title: string;
} | null;

const viewTabs: Array<{ id: ProjectView; label: string; icon: "home" | "backlog" | "board" | "docs" }> = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "backlog", label: "Backlog", icon: "backlog" },
  { id: "planning", label: "Planning", icon: "board" },
  { id: "board", label: "Board", icon: "board" },
  { id: "docs", label: "Docs", icon: "docs" },
];

export function ProjectPage() {
  const { projectSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/$projectSlug" });

  const board = useStore((s) => s.board);
  const documentation = useStore((s) => s.documentation);
  const activityEntries = useStore((s) => s.activityEntries);
  const isLoading = useStore((s) => s.isLoading);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const confirmDialog = useStore((s) => s.confirmDialog);
  const toasts = useStore((s) => s.toasts);
  const setBoard = useStore((s) => s.setBoard);
  const setDocumentation = useStore((s) => s.setDocumentation);
  const setActivityEntries = useStore((s) => s.setActivityEntries);
  const setIsLoading = useStore((s) => s.setIsLoading);
  const setSelectedTaskId = useStore((s) => s.setSelectedTaskId);
  const setConfirmDialog = useStore((s) => s.setConfirmDialog);
  const addToast = useStore((s) => s.addToast);

  const [isMutating, setIsMutating] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isCreateEpicOpen, setIsCreateEpicOpen] = useState(false);
  const [epicTitle, setEpicTitle] = useState("");
  const [epicDescription, setEpicDescription] = useState("");
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskDescription, setQuickTaskDescription] = useState("");
  const [quickTaskEpicId, setQuickTaskEpicId] = useState("");
  const [backlogQuery, setBacklogQuery] = useState("");
  const [backlogEpicFilter, setBacklogEpicFilter] = useState("all");
  const [showCompletedBacklog, setShowCompletedBacklog] = useState(false);
  const [backlogSort, setBacklogSort] = useState<BacklogSort>("backlog");
  const [sprintName, setSprintName] = useState("");
  const [retrospectiveNotesDraft, setRetrospectiveNotesDraft] = useState("");
  const [selectedDocNodeId, setSelectedDocNodeId] = useState<string | null>(null);
  const [selectedDocName, setSelectedDocName] = useState("");
  const [selectedDocContent, setSelectedDocContent] = useState("");
  const [docDirName, setDocDirName] = useState("");
  const [docPageName, setDocPageName] = useState("");

  const activeView = search.view;
  const activeSprintId = board?.activeSprint?.id ?? null;
  const isBusy = isLoading || isMutating;

  const taskRecords = (board?.epics ?? []).flatMap((epic) =>
    epic.tasks.map((task) => ({ epic: { id: epic.id, title: epic.title, position: epic.position }, task })),
  );

  const selectedTaskRecord = taskRecords.find((r) => r.task.id === selectedTaskId) ?? null;

  const selectedDocumentationNode = findDocumentationNode(documentation?.nodes ?? [], selectedDocNodeId);
  const selectedDocumentationParent = selectedDocumentationNode?.parentId
    ? findDocumentationNode(documentation?.nodes ?? [], selectedDocumentationNode.parentId)
    : null;
  const selectedPage = selectedDocumentationNode?.kind === "page" ? selectedDocumentationNode : null;
  const selectedDirectory = selectedDocumentationNode?.kind === "directory" ? selectedDocumentationNode : null;
  const activeDocumentationDirectory = selectedDirectory ?? selectedDocumentationParent;

  async function loadProject() {
    setIsLoading(true);
    try {
      const [boardData, documentationData, activityData] = await Promise.all([
        fetchBoard(projectSlug), fetchDocumentation(projectSlug), fetchActivityLog(projectSlug, 20),
      ]);
      setBoard(boardData);
      setDocumentation(documentationData);
      setActivityEntries(activityData.activities);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load project", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadBoard() {
    const data = await fetchBoard(projectSlug);
    setBoard(data);
  }

  async function loadDocumentation() {
    const data = await fetchDocumentation(projectSlug);
    setDocumentation(data);
  }

  useEffect(() => { void loadProject(); }, [projectSlug]);

  useEffect(() => {
    setRetrospectiveNotesDraft(board?.activeSprint?.retrospectiveNotes ?? "");
  }, [board?.activeSprint?.id, board?.activeSprint?.retrospectiveNotes]);

  useEffect(() => {
    if (!quickTaskEpicId && board?.epics[0]) setQuickTaskEpicId(board.epics[0].id);
  }, [board?.epics]);

  useEffect(() => {
    if (!documentation) return;
    if (findDocumentationNode(documentation.nodes, selectedDocNodeId)) return;
    const fallback = findFirstPageNode(documentation.nodes) ?? documentation.nodes[0] ?? null;
    setSelectedDocNodeId(fallback?.id ?? null);
  }, [documentation, selectedDocNodeId]);

  useEffect(() => {
    if (!selectedDocumentationNode) {
      setSelectedDocName(""); setSelectedDocContent(""); return;
    }
    setSelectedDocName(selectedDocumentationNode.name);
    setSelectedDocContent(selectedDocumentationNode.kind === "page" ? selectedDocumentationNode.content : "");
  }, [selectedDocumentationNode?.id, selectedDocumentationNode?.name, selectedDocumentationNode?.content, selectedDocumentationNode?.kind]);

  useEffect(() => {
    if (selectedTaskId && !selectedTaskRecord) setSelectedTaskId(null);
  }, [selectedTaskId, selectedTaskRecord]);

  async function runMutation(action: () => Promise<void>, successMsg: string, errorMsg: string) {
    setIsMutating(true);
    try {
      await action();
      if (successMsg) addToast(successMsg, "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : errorMsg, "error");
    } finally {
      setIsMutating(false);
    }
  }

  function changeView(view: ProjectView) {
    void navigate({ to: "/projects/$projectSlug", params: { projectSlug }, search: { view } });
  }

  async function handleCreateEpic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!epicTitle.trim()) return;
    await runMutation(async () => {
      await createEpic(projectSlug, epicTitle.trim(), epicDescription.trim());
      setEpicTitle(""); setEpicDescription(""); setIsCreateEpicOpen(false);
      await loadBoard();
    }, "Epic created", "Failed to create epic");
  }

  async function handleQuickCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickTaskTitle.trim() || !quickTaskEpicId) return;
    await runMutation(async () => {
      await createTask(projectSlug, quickTaskEpicId, quickTaskTitle.trim(), quickTaskDescription.trim());
      setQuickTaskTitle(""); setQuickTaskDescription(""); setIsQuickCreateOpen(false);
      await loadBoard();
    }, "Task created", "Failed to create task");
  }

  async function handleCreateTask(epicId: string, title: string) {
    await runMutation(async () => {
      await createTask(projectSlug, epicId, title);
      await loadBoard();
    }, "Task created", "Failed to create task");
  }

  async function handleStartSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sprintName.trim()) return;
    await runMutation(async () => {
      await startSprint(projectSlug, sprintName.trim());
      setSprintName("");
      await loadBoard();
    }, "Sprint started", "Failed to start sprint");
  }

  async function handleCompleteSprint() {
    await runMutation(async () => {
      if (board?.activeSprint) {
        await updateSprintRetrospectiveNotes(projectSlug, board.activeSprint.id, retrospectiveNotesDraft);
      }
      await completeActiveSprint(projectSlug);
      await loadBoard();
    }, "Sprint completed", "Failed to complete sprint");
  }

  async function handleUpdateTaskDetails(taskId: string, input: { title: string; description?: string; status?: TaskStatus }) {
    await runMutation(async () => {
      await updateTask(projectSlug, taskId, input);
      await loadBoard();
    }, "Task updated", "Failed to update task");
  }

  async function handleUpdateTaskStatus(task: { id: string; title: string; description: string }, status: TaskStatus) {
    await runMutation(async () => {
      await updateTaskStatus(projectSlug, task.id, { title: task.title, description: task.description, status });
      await loadBoard();
    }, "", "Failed to update task status");
  }

  async function handleBulkStatusChange(status: TaskStatus) {
    const ids = new Set(useStore.getState().selectedTaskIds.filter(Boolean));
    const selected = taskRecords.filter((r) => ids.has(r.task.id));
    if (!selected.length) return;
    await runMutation(async () => {
      for (const record of selected) {
        await updateTaskStatus(projectSlug, record.task.id, { title: record.task.title, description: record.task.description, status });
      }
      await loadBoard();
    }, `${selected.length} tasks updated`, "Failed to update tasks");
  }

  async function handleBulkAddToSprint() {
    const ids = new Set(useStore.getState().selectedTaskIds.filter(Boolean));
    if (!ids.size) return;
    await runMutation(async () => {
      for (const taskId of ids) await addTaskToSprint(projectSlug, taskId);
      await loadBoard();
    }, `${ids.size} tasks added to sprint`, "Failed to add tasks to sprint");
  }

  async function handleAddTaskToSprint(taskId: string) {
    await runMutation(async () => { await addTaskToSprint(projectSlug, taskId); await loadBoard(); }, "", "Failed to add task to sprint");
  }

  async function handleRemoveTaskFromSprint(taskId: string) {
    await runMutation(async () => { await removeTaskFromSprint(projectSlug, taskId); await loadBoard(); }, "", "Failed to remove task from sprint");
  }

  function requestTaskDeletion(taskId: string) {
    const record = taskRecords.find((r) => r.task.id === taskId);
    if (!record) return;
    setConfirmDialog({
      title: `Delete "${record.task.title}"?`,
      message: "This task will be removed from the backlog and active sprint.",
      confirmLabel: "Delete task",
      onConfirm: async () => {
        await runMutation(async () => {
          if (selectedTaskId === taskId) setSelectedTaskId(null);
          await deleteTask(projectSlug, taskId);
          await loadBoard();
        }, "Task deleted", "Failed to delete task");
        return true;
      },
    });
  }

  function requestEpicDeletion(epicId: string) {
    const epic = board?.epics.find((e) => e.id === epicId);
    if (!epic) return;
    setConfirmDialog({
      title: `Delete "${epic.title}"?`,
      message: `This will remove the epic and its ${epic.tasks.length} task${epic.tasks.length === 1 ? "" : "s"}.`,
      confirmLabel: "Delete epic",
      onConfirm: async () => {
        await runMutation(async () => { await deleteEpic(projectSlug, epicId); await loadBoard(); }, "Epic deleted", "Failed to delete epic");
        return true;
      },
    });
  }

  async function handleConfirmDialog() {
    if (!confirmDialog) return;
    await confirmDialog.onConfirm();
    setConfirmDialog(null);
  }

  async function handleCreateDocDir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!docDirName.trim()) return;
    await runMutation(async () => {
      const response = (await createDocumentationNode(projectSlug, { kind: "directory", parentId: activeDocumentationDirectory?.id ?? null, name: docDirName.trim() })) as { node: { id: string } };
      setDocDirName("");
      await loadDocumentation();
      setSelectedDocNodeId(response.node.id);
    }, "Directory created", "Failed to create directory");
  }

  async function handleCreateDocPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!docPageName.trim()) return;
    await runMutation(async () => {
      const response = (await createDocumentationNode(projectSlug, { kind: "page", parentId: activeDocumentationDirectory?.id ?? null, name: docPageName.trim(), content: "" })) as { node: { id: string } };
      setDocPageName("");
      await loadDocumentation();
      setSelectedDocNodeId(response.node.id);
    }, "Page created", "Failed to create page");
  }

  async function handleSaveDocNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocumentationNode) return;
    await runMutation(async () => {
      await updateDocumentationNode(projectSlug, selectedDocumentationNode.id, { name: selectedDocName, content: selectedDocumentationNode.kind === "page" ? selectedDocContent : undefined });
      await loadDocumentation();
    }, "Documentation saved", "Failed to save documentation");
  }

  function requestDocDeletion() {
    if (!selectedDocumentationNode) return;
    setConfirmDialog({
      title: `Delete "${selectedDocumentationNode.name}"?`,
      message: selectedDocumentationNode.kind === "directory" ? "This will remove the directory and its visible child pages." : "This will remove the page from project documentation.",
      confirmLabel: selectedDocumentationNode.kind === "directory" ? "Delete directory" : "Delete page",
      onConfirm: async () => {
        await runMutation(async () => {
          setSelectedDocNodeId(null);
          await deleteDocumentationNode(projectSlug, selectedDocumentationNode.id);
          await loadDocumentation();
        }, "Documentation deleted", "Failed to delete documentation");
        return true;
      },
    });
  }

  const commandActions: CommandAction[] = [
    ...viewTabs.map((tab): CommandAction => ({
      id: `view-${tab.id}`, label: `Open ${tab.label}`, hint: board?.project.name ?? projectSlug,
      icon: tab.icon, keywords: `${tab.label} ${projectSlug}`, onSelect: () => changeView(tab.id),
    })),
    { id: "create-task", label: "Create task", hint: "Open quick create", icon: "plus", onSelect: () => setIsQuickCreateOpen(true) },
    { id: "create-epic", label: "Create epic", hint: "Add backlog structure", icon: "plus", onSelect: () => setIsCreateEpicOpen(true) },
    ...taskRecords.slice(0, 20).map((r): CommandAction => ({
      id: `task-${r.task.id}`, label: r.task.title, hint: `${r.epic.title} · status: ${r.task.status}`,
      keywords: `${r.epic.title} ${r.task.description}`, icon: "search" as const,
      onSelect: () => setSelectedTaskId(r.task.id),
    })),
    ...(documentation?.nodes ?? []).slice(0, 12).map((node): CommandAction => ({
      id: `doc-${node.id}`, label: node.name, hint: node.path, icon: "docs" as const,
      onSelect: () => { changeView("docs"); setSelectedDocNodeId(node.id); },
    })),
  ];

  const navSections: ShellNavSection[] = [
    {
      label: "Workspace",
      items: [
        { id: "home", label: "Projects", icon: "home" as const, onClick: () => void navigate({ to: "/" }) },
        { id: "overview", label: "Overview", icon: "projects" as const, active: activeView === "overview", onClick: () => changeView("overview") },
      ],
    },
    {
      label: "Delivery",
      items: [
        { id: "backlog", label: "Backlog", icon: "backlog" as const, active: activeView === "backlog", onClick: () => changeView("backlog") },
        { id: "planning", label: "Planning", icon: "board" as const, active: activeView === "planning", onClick: () => changeView("planning") },
        { id: "board", label: "Board", icon: "board" as const, active: activeView === "board", onClick: () => changeView("board") },
      ],
    },
    {
      label: "Documentation",
      items: [
        { id: "docs", label: "Docs", icon: "docs" as const, active: activeView === "docs", badge: countDocumentationNodes(documentation?.nodes ?? []), onClick: () => changeView("docs") },
      ],
    },
  ];

  const pageHeader = (
    <div className="page-header stack-gap">
      <div className="page-header-row">
        <div>
          <p className="section-kicker">Project workspace</p>
          <h1>{board?.project.name ?? documentation?.project.name ?? projectSlug}</h1>
        </div>
        <div className="page-header-actions">
          {activeSprintId ? (
            <button className="button button-secondary" disabled={isBusy} onClick={handleCompleteSprint} type="button">Complete sprint</button>
          ) : (
            <button className="button button-secondary" onClick={() => changeView("planning")} type="button">Start sprint</button>
          )}
          <button className="button button-primary" onClick={() => setIsQuickCreateOpen(true)} type="button">Create task</button>
        </div>
      </div>
      <div className="view-tabs" role="tablist" aria-label="Project views">
        {viewTabs.map((tab) => (
          <button
            aria-selected={activeView === tab.id}
            className={`view-tab${activeView === tab.id ? " active" : ""}`}
            key={tab.id}
            onClick={() => changeView(tab.id)}
            role="tab"
            type="button"
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <AppShell
        commandLabel="Search tasks and docs"
        navSections={navSections}
        onCommandClick={() => setIsCommandOpen(true)}
        onQuickCreate={() => setIsQuickCreateOpen(true)}
        pageHeader={pageHeader}
        sidebarMeta={
          <div className="sidebar-note">
            <p>Available in this project</p>
            <small>Epics, tasks, sprint planning, status changes, sprint history, and documentation.</small>
          </div>
        }
        topbarMeta={<div className="workspace-badge"><span>{board?.project.slug ?? projectSlug}</span></div>}
      >
        {isLoading ? (
          <div className="skeleton-grid">
            <div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" />
          </div>
        ) : (
          <>
            <ErrorBoundary>
              {activeView === "overview" ? (
                <OverviewView
                  activityEntries={activityEntries}
                  board={board}
                  documentationCount={countDocumentationNodes(documentation?.nodes ?? [])}
                  onOpenBacklog={() => changeView("backlog")}
                  onOpenTask={setSelectedTaskId}
                  sprintRecords={taskRecords.filter((r) => r.task.sprintId === activeSprintId)}
                />
              ) : null}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeView === "backlog" ? (
                <BacklogView
                  activeSprintId={activeSprintId}
                  epicFilter={backlogEpicFilter}
                  query={backlogQuery}
                  sort={backlogSort}
                  showCompleted={showCompletedBacklog}
                  projectEpics={board?.epics ?? []}
                  taskRecords={taskRecords}
                  onAddTaskToSprint={handleAddTaskToSprint}
                  onBulkAddToSprint={handleBulkAddToSprint}
                  onBulkStatusChange={handleBulkStatusChange}
                  onCreateEpic={() => setIsCreateEpicOpen(true)}
                  onCreateTask={handleCreateTask}
                  onDeleteTask={requestTaskDeletion}
                  onEpicFilterChange={setBacklogEpicFilter}
                  onOpenTask={setSelectedTaskId}
                  onQueryChange={setBacklogQuery}
                  onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
                  onShowCompletedChange={setShowCompletedBacklog}
                  onSortChange={setBacklogSort}
                />
              ) : null}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeView === "planning" ? (
                <PlanningView
                  activeSprint={board?.activeSprint ?? null}
                  backlogRecords={taskRecords}
                  onAddTaskToSprint={handleAddTaskToSprint}
                  onOpenTask={setSelectedTaskId}
                  onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
                  onStartSprint={handleStartSprint}
                  sprintName={sprintName}
                  onSprintNameChange={setSprintName}
                />
              ) : null}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeView === "board" ? (
                <BoardView
                  activeSprint={board?.activeSprint ?? null}
                  sprintTasks={board?.sprintTasks ?? []}
                  onOpenTask={setSelectedTaskId}
                  onTaskDrop={(taskId, status) => {
                    const record = taskRecords.find((r) => r.task.id === taskId);
                    if (record) void handleUpdateTaskStatus(record.task, status);
                  }}
                />
              ) : null}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeView === "docs" ? (
                <DocumentationView
                  activeDirectoryPath={activeDocumentationDirectory?.path ?? "Root"}
                  directoryName={docDirName}
                  documentation={documentation}
                  pageName={docPageName}
                  selectedDocumentationContent={selectedDocContent}
                  selectedDocumentationName={selectedDocName}
                  selectedDocumentationNode={selectedDocumentationNode}
                  selectedPage={selectedPage}
                  onCreateDirectory={handleCreateDocDir}
                  onCreatePage={handleCreateDocPage}
                  onDelete={requestDocDeletion}
                  onDirectoryNameChange={setDocDirName}
                  onPageNameChange={setDocPageName}
                  onSave={handleSaveDocNode}
                  onSelectedContentChange={setSelectedDocContent}
                  onSelectedNameChange={setSelectedDocName}
                  onSelectNode={setSelectedDocNodeId}
                />
              ) : null}
            </ErrorBoundary>
          </>
        )}
      </AppShell>

      <CommandPalette actions={commandActions} isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
      <ToastContainer />

      {isQuickCreateOpen ? (
        <div aria-hidden={false} className="overlay-backdrop" role="presentation">
          <section aria-modal="true" className="confirmation-modal create-modal" role="dialog">
            <div className="detail-section-heading"><h3>Create task</h3></div>
            <p className="section-subtitle">Create a task directly inside an epic that already exists.</p>
            <form className="stack-form" onSubmit={handleQuickCreateTask}>
              <label className="field">
                <span>Title</span>
                <input autoFocus onChange={(e) => setQuickTaskTitle(e.target.value)} placeholder="Task title" value={quickTaskTitle} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea onChange={(e) => setQuickTaskDescription(e.target.value)} placeholder="What should happen and why?" value={quickTaskDescription} />
              </label>
              <label className="field">
                <span>Epic</span>
                <select onChange={(e) => setQuickTaskEpicId(e.target.value)} value={quickTaskEpicId}>
                  {(board?.epics ?? []).map((epic) => (<option key={epic.id} value={epic.id}>{epic.title}</option>))}
                </select>
              </label>
              <div className="toolbar-actions">
                <button className="button button-secondary" onClick={() => setIsQuickCreateOpen(false)} type="button">Cancel</button>
                <button className="button button-primary" disabled={isBusy} type="submit">Create task</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isCreateEpicOpen ? (
        <div aria-hidden={false} className="overlay-backdrop" role="presentation">
          <section aria-modal="true" className="confirmation-modal create-modal" role="dialog">
            <div className="detail-section-heading"><h3>Create epic</h3></div>
            <form className="stack-form" onSubmit={handleCreateEpic}>
              <label className="field">
                <span>Epic title</span>
                <input autoFocus onChange={(e) => setEpicTitle(e.target.value)} value={epicTitle} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea onChange={(e) => setEpicDescription(e.target.value)} placeholder="Describe the user outcome this epic supports." value={epicDescription} />
              </label>
              <div className="toolbar-actions">
                <button className="button button-secondary" onClick={() => setIsCreateEpicOpen(false)} type="button">Cancel</button>
                <button className="button button-primary" disabled={isBusy} type="submit">Create epic</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedTaskRecord ? (
        <TaskDetailsDialog
          activeSprintId={activeSprintId}
          epicTitle={selectedTaskRecord.epic.title}
          isMutating={isBusy}
          onAddTaskToSprint={handleAddTaskToSprint}
          onClose={() => setSelectedTaskId(null)}
          onDeleteTask={() => requestTaskDeletion(selectedTaskRecord.task.id)}
          onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
          onSaveTask={handleUpdateTaskDetails}
          task={selectedTaskRecord.task as Task}
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
    </>
  );
}
