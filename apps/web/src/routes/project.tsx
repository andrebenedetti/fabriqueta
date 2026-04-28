import {
  FormEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  moveTask,
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
import { isProjectView, useThemeMode, type ProjectView } from "../frontendState";
import type {
  ActivityEntry,
  Board,
  Documentation,
  DocumentationNode,
  Epic,
  SprintHistoryEntry,
  SprintTask,
  Task,
  TaskStatus,
} from "../types";
import { Route as RootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/projects/$projectSlug",
  validateSearch: (search: Record<string, unknown>) => ({
    view:
      typeof search.view === "string" && isProjectView(search.view)
        ? search.view
        : "overview",
  }),
  component: ProjectPage,
});

type BacklogSort = "backlog" | "title" | "epic" | "status";
type ConfirmDialogState = {
  confirmLabel: string;
  message: string;
  onConfirm: () => Promise<boolean>;
  title: string;
};
type TaskRecord = {
  epic: Epic;
  task: Task;
};

const viewTabs: Array<{
  id: ProjectView;
  label: string;
  icon: "home" | "backlog" | "board" | "docs";
}> = [
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
  const [theme, setTheme] = useThemeMode();
  const [board, setBoard] = useState<Board | null>(null);
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [backlogSort, setBacklogSort] = useState<BacklogSort>("backlog");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sprintName, setSprintName] = useState("");
  const [retrospectiveNotesDraft, setRetrospectiveNotesDraft] = useState("");
  const [selectedDocumentationNodeId, setSelectedDocumentationNodeId] = useState<string | null>(null);
  const [selectedDocumentationName, setSelectedDocumentationName] = useState("");
  const [selectedDocumentationContent, setSelectedDocumentationContent] = useState("");
  const [documentationDirectoryName, setDocumentationDirectoryName] = useState("");
  const [documentationPageName, setDocumentationPageName] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);

  const activeView = search.view;
  const activeSprintId = board?.activeSprint?.id ?? null;
  const isBusy = isLoading || isMutating;
  const deferredBacklogQuery = useDeferredValue(backlogQuery);

  async function loadProject() {
    setIsLoading(true);

    try {
      const [boardData, documentationData, activityData] = await Promise.all([
        fetchBoard(projectSlug),
        fetchDocumentation(projectSlug),
        fetchActivityLog(projectSlug, 20),
      ]);

      setBoard(boardData);
      setDocumentation(documentationData);
      setActivityEntries(activityData.activities);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load project");
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

  useEffect(() => {
    void loadProject();
  }, [projectSlug]);

  useEffect(() => {
    setRetrospectiveNotesDraft(board?.activeSprint?.retrospectiveNotes ?? "");
  }, [board?.activeSprint?.id, board?.activeSprint?.retrospectiveNotes]);

  useEffect(() => {
    if (!quickTaskEpicId && board?.epics[0]) {
      setQuickTaskEpicId(board.epics[0].id);
    }
  }, [board?.epics, quickTaskEpicId]);

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

    const fallback = findFirstPageNode(documentation.nodes) ?? documentation.nodes[0] ?? null;
    setSelectedDocumentationNodeId(fallback?.id ?? null);
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

  const taskRecords = useMemo<TaskRecord[]>(
    () =>
      (board?.epics ?? []).flatMap((epic) =>
        epic.tasks.map((task) => ({
          epic,
          task,
        })),
      ),
    [board?.epics],
  );

  const selectedTaskRecord = taskRecords.find((record) => record.task.id === selectedTaskId) ?? null;

  useEffect(() => {
    if (selectedTaskId && !selectedTaskRecord) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, selectedTaskRecord]);

  const filteredBacklogRecords = useMemo(() => {
    const query = deferredBacklogQuery.trim().toLowerCase();

    return sortBacklogTaskRows(
      taskRecords.filter(({ epic, task }) => {
        if (!showCompletedTasks && task.status === "done") {
          return false;
        }

        if (backlogEpicFilter !== "all" && epic.id !== backlogEpicFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        return `${task.title} ${task.description} ${epic.title} ${epic.description}`
          .toLowerCase()
          .includes(query);
      }),
      backlogSort,
    );
  }, [backlogEpicFilter, backlogSort, deferredBacklogQuery, showCompletedTasks, taskRecords]);

  const sprintRecords = useMemo(
    () => taskRecords.filter((record) => record.task.sprintId === activeSprintId),
    [activeSprintId, taskRecords],
  );

  const boardColumns: Array<{ key: TaskStatus; title: string; tasks: SprintTask[] }> = [
    {
      key: "todo",
      title: "To do",
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

  function changeView(view: ProjectView) {
    startTransition(() => {
      void navigate({
        to: "/projects/$projectSlug",
        params: { projectSlug },
        search: { view },
      });
    });
  }

  async function handleCreateEpic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!epicTitle.trim()) {
      return;
    }

    await runMutation(async () => {
      await createEpic(projectSlug, epicTitle.trim(), epicDescription.trim());
      setEpicTitle("");
      setEpicDescription("");
      setIsCreateEpicOpen(false);
      await loadBoard();
    }, "Failed to create epic");
  }

  async function handleQuickCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickTaskTitle.trim() || !quickTaskEpicId) {
      return;
    }

    await runMutation(async () => {
      await createTask(projectSlug, quickTaskEpicId, quickTaskTitle.trim(), quickTaskDescription.trim());
      setQuickTaskTitle("");
      setQuickTaskDescription("");
      setIsQuickCreateOpen(false);
      await loadBoard();
    }, "Failed to create task");
  }

  async function handleStartSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sprintName.trim()) {
      return;
    }

    await runMutation(async () => {
      await startSprint(projectSlug, sprintName.trim());
      setSprintName("");
      await loadBoard();
    }, "Failed to start sprint");
  }

  async function handleCompleteSprint() {
    await runMutation(async () => {
      if (board?.activeSprint) {
        await updateSprintRetrospectiveNotes(projectSlug, board.activeSprint.id, retrospectiveNotesDraft);
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
      await updateSprintRetrospectiveNotes(projectSlug, sprintId, retrospectiveNotesDraft);
      await loadBoard();
    }, "Failed to save retrospective notes");
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

  async function handleUpdateTaskStatus(task: Task, status: TaskStatus) {
    await runMutation(async () => {
      await updateTaskStatus(projectSlug, task.id, {
        title: task.title,
        description: task.description,
        status,
      });
      await loadBoard();
    }, "Failed to update task status");
  }

  async function handleBulkStatusChange(status: TaskStatus) {
    const selectedRecords = taskRecords.filter((record) => selectedTaskIds.includes(record.task.id));
    if (!selectedRecords.length) {
      return;
    }

    await runMutation(async () => {
      for (const record of selectedRecords) {
        await updateTaskStatus(projectSlug, record.task.id, {
          title: record.task.title,
          description: record.task.description,
          status,
        });
      }
      setSelectedTaskIds([]);
      await loadBoard();
    }, "Failed to update selected tasks");
  }

  async function handleBulkAddToSprint() {
    if (!selectedTaskIds.length) {
      return;
    }

    await runMutation(async () => {
      for (const taskId of selectedTaskIds) {
        await addTaskToSprint(projectSlug, taskId);
      }
      setSelectedTaskIds([]);
      await loadBoard();
    }, "Failed to add selected tasks to sprint");
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

  async function handleBacklogDrop(sourceTaskId: string, targetTaskId: string) {
    if (!sourceTaskId || !targetTaskId || sourceTaskId === targetTaskId || backlogSort !== "backlog") {
      return;
    }

    const source = taskRecords.find((record) => record.task.id === sourceTaskId);
    const target = taskRecords.find((record) => record.task.id === targetTaskId);
    if (!source || !target || source.epic.id !== target.epic.id) {
      return;
    }

    const ordered = [...source.epic.tasks].sort((left, right) => left.position - right.position);
    const sourceIndex = ordered.findIndex((task) => task.id === sourceTaskId);
    const targetIndex = ordered.findIndex((task) => task.id === targetTaskId);
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
      return;
    }

    await runMutation(async () => {
      const direction = sourceIndex < targetIndex ? "down" : "up";
      const distance = Math.abs(targetIndex - sourceIndex);

      for (let index = 0; index < distance; index += 1) {
        await moveTask(projectSlug, sourceTaskId, direction);
      }

      await loadBoard();
    }, "Failed to reorder task");
  }

  function requestTaskDeletion(taskId: string) {
    const record = taskRecords.find((candidate) => candidate.task.id === taskId);
    if (!record) {
      return;
    }

    setConfirmDialog({
      title: `Delete "${record.task.title}"?`,
      message: "This task will be removed from the backlog and from the active sprint if it is assigned there.",
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

  function requestEpicDeletion(epicId: string) {
    const epic = board?.epics.find((candidate) => candidate.id === epicId);
    if (!epic) {
      return;
    }

    setConfirmDialog({
      title: `Delete "${epic.title}"?`,
      message: `This will permanently remove the epic and its ${epic.tasks.length} task${epic.tasks.length === 1 ? "" : "s"}.`,
      confirmLabel: "Delete epic",
      onConfirm: () =>
        runMutation(async () => {
          await deleteEpic(projectSlug, epicId);
          await loadBoard();
        }, "Failed to delete epic"),
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

  async function handleCreateDocumentationDirectory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentationDirectoryName.trim()) {
      return;
    }

    await runMutation(async () => {
      const response = (await createDocumentationNode(projectSlug, {
        kind: "directory",
        parentId: activeDocumentationDirectory?.id ?? null,
        name: documentationDirectoryName.trim(),
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
        name: documentationPageName.trim(),
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

    setConfirmDialog({
      title: `Delete "${selectedDocumentationNode.name}"?`,
      message:
        selectedDocumentationNode.kind === "directory"
          ? "This will remove the directory and its visible child pages."
          : "This will remove the page from project documentation.",
      confirmLabel:
        selectedDocumentationNode.kind === "directory" ? "Delete directory" : "Delete page",
      onConfirm: () =>
        runMutation(async () => {
          setSelectedDocumentationNodeId(null);
          await deleteDocumentationNode(projectSlug, selectedDocumentationNode.id);
          await loadDocumentation();
        }, "Failed to delete documentation"),
    });
  }

  const commandActions: CommandAction[] = [
    ...viewTabs.map((tab): CommandAction => ({
      id: `view-${tab.id}`,
      label: `Open ${tab.label}`,
      hint: board?.project.name ?? projectSlug,
      icon: tab.icon,
      keywords: `${tab.label} ${projectSlug}`,
      onSelect: () => changeView(tab.id),
    })),
    {
      id: "create-task",
      label: "Create task",
      hint: "Open quick create",
      icon: "plus",
      onSelect: () => setIsQuickCreateOpen(true),
    },
    {
      id: "create-epic",
      label: "Create epic",
      hint: "Add backlog structure",
      icon: "plus",
      onSelect: () => setIsCreateEpicOpen(true),
    },
    ...taskRecords.slice(0, 20).map((record): CommandAction => ({
      id: `task-${record.task.id}`,
      label: record.task.title,
      hint: `${record.epic.title} · ${taskStatusLabel(record.task.status)}`,
      keywords: `${record.epic.title} ${record.task.description}`,
      icon: "search",
      onSelect: () => setSelectedTaskId(record.task.id),
    })),
    ...(documentation?.nodes ?? []).slice(0, 12).map((node): CommandAction => ({
      id: `doc-${node.id}`,
      label: node.name,
      hint: node.path,
      icon: "docs",
      onSelect: () => {
        changeView("docs");
        setSelectedDocumentationNodeId(node.id);
      },
    })),
  ];

  const navSections: ShellNavSection[] = [
    {
      label: "Workspace",
      items: [
        {
          id: "home",
          label: "Projects",
          icon: "home",
          onClick: () => void navigate({ to: "/" }),
        },
        {
          id: "overview",
          label: "Overview",
          icon: "projects",
          active: activeView === "overview",
          onClick: () => changeView("overview"),
        },
      ],
    },
    {
      label: "Delivery",
      items: [
        {
          id: "backlog",
          label: "Backlog",
          icon: "backlog",
          active: activeView === "backlog",
          onClick: () => changeView("backlog"),
        },
        {
          id: "planning",
          label: "Planning",
          icon: "board",
          active: activeView === "planning",
          onClick: () => changeView("planning"),
        },
        {
          id: "board",
          label: "Board",
          icon: "board",
          active: activeView === "board",
          onClick: () => changeView("board"),
        },
      ],
    },
    {
      label: "Documentation",
      items: [
        {
          id: "docs",
          label: "Docs",
          icon: "docs",
          active: activeView === "docs",
          badge: countDocumentationNodes(documentation?.nodes ?? []),
          onClick: () => changeView("docs"),
        },
      ],
    },
  ];

  const pageHeader = (
    <div className="page-header stack-gap">
      <div className="page-header-row">
        <div>
          <p className="section-kicker">Project workspace</p>
          <h1>{board?.project.name ?? documentation?.project.name ?? projectSlug}</h1>
          <p className="section-subtitle">
            Backlog, sprint execution, history, and documentation in one cleaner workspace.
          </p>
        </div>
        <div className="page-header-actions">
          {activeSprintId ? (
            <button className="button button-secondary" disabled={isBusy} onClick={handleCompleteSprint} type="button">
              Complete sprint
            </button>
          ) : (
            <button className="button button-secondary" onClick={() => changeView("planning")} type="button">
              Start sprint
            </button>
          )}
          <button className="button button-primary" onClick={() => setIsQuickCreateOpen(true)} type="button">
            Create task
          </button>
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
        onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
        pageHeader={pageHeader}
        sidebarMeta={
          <div className="sidebar-note">
            <p>Available in this project</p>
            <small>Epics, tasks, sprint planning, task status changes, sprint history, and documentation.</small>
          </div>
        }
        themeLabel={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        topbarMeta={
          <div className="workspace-badge">
            <span>{board?.project.slug ?? projectSlug}</span>
          </div>
        }
      >
        {activeView === "overview" ? (
          <OverviewView
            activityEntries={activityEntries}
            board={board}
            documentationCount={countDocumentationNodes(documentation?.nodes ?? [])}
            onOpenBacklog={() => changeView("backlog")}
            onOpenTask={setSelectedTaskId}
            sprintRecords={sprintRecords}
          />
        ) : null}

        {activeView === "backlog" ? (
          <BacklogView
            activeSprintId={activeSprintId}
            backlogEpicFilter={backlogEpicFilter}
            backlogQuery={backlogQuery}
            backlogSort={backlogSort}
            filteredBacklogRecords={filteredBacklogRecords}
            selectedTaskIds={selectedTaskIds}
            showCompletedTasks={showCompletedTasks}
            onAddTaskToSprint={handleAddTaskToSprint}
            onBacklogDrop={handleBacklogDrop}
            onBulkAddToSprint={handleBulkAddToSprint}
            onBulkStatusChange={handleBulkStatusChange}
            onCreateEpic={() => setIsCreateEpicOpen(true)}
            onDeleteTask={requestTaskDeletion}
            onDragTaskChange={setDragTaskId}
            onEpicFilterChange={setBacklogEpicFilter}
            onOpenTask={setSelectedTaskId}
            onQueryChange={setBacklogQuery}
            onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
            onSelectedTaskIdsChange={setSelectedTaskIds}
            onShowCompletedChange={setShowCompletedTasks}
            onSortChange={setBacklogSort}
            projectEpics={board?.epics ?? []}
          />
        ) : null}

        {activeView === "planning" ? (
          <PlanningView
            activeSprint={board?.activeSprint ?? null}
            backlogRecords={taskRecords.filter((record) => record.task.sprintId !== activeSprintId)}
            retrospectiveNotesDraft={retrospectiveNotesDraft}
            sprintName={sprintName}
            sprintRecords={sprintRecords}
            onAddTaskToSprint={handleAddTaskToSprint}
            onOpenTask={setSelectedTaskId}
            onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
            onRetrospectiveNotesChange={setRetrospectiveNotesDraft}
            onSaveRetrospectiveNotes={handleSaveRetrospectiveNotes}
            onSprintNameChange={setSprintName}
            onStartSprint={handleStartSprint}
          />
        ) : null}

        {activeView === "board" ? (
          <BoardView
            activeSprint={board?.activeSprint ?? null}
            boardColumns={boardColumns}
            dragTaskId={dragTaskId}
            onDragTaskChange={setDragTaskId}
            onOpenTask={setSelectedTaskId}
            onTaskDrop={(taskId, status) => {
              const record = taskRecords.find((candidate) => candidate.task.id === taskId);
              if (record) {
                void handleUpdateTaskStatus(record.task, status);
              }
            }}
          />
        ) : null}

        {activeView === "docs" ? (
          <DocumentationView
            activeDirectoryPath={activeDocumentationDirectory?.path ?? "Root"}
            directoryName={documentationDirectoryName}
            documentation={documentation}
            pageName={documentationPageName}
            selectedDocumentationContent={selectedDocumentationContent}
            selectedDocumentationName={selectedDocumentationName}
            selectedDocumentationNode={selectedDocumentationNode}
            selectedPage={selectedPage}
            onCreateDirectory={handleCreateDocumentationDirectory}
            onCreatePage={handleCreateDocumentationPage}
            onDelete={requestDocumentationDeletion}
            onDirectoryNameChange={setDocumentationDirectoryName}
            onPageNameChange={setDocumentationPageName}
            onSave={handleSaveDocumentationNode}
            onSelectedContentChange={setSelectedDocumentationContent}
            onSelectedNameChange={setSelectedDocumentationName}
            onSelectNode={setSelectedDocumentationNodeId}
          />
        ) : null}

        {error ? <div className="inline-banner danger">{error}</div> : null}
      </AppShell>

      <CommandPalette actions={commandActions} isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      {isQuickCreateOpen ? (
        <div aria-hidden={false} className="overlay-backdrop" role="presentation">
          <section aria-modal="true" className="confirmation-modal create-modal" role="dialog">
            <div className="detail-section-heading">
              <h3>Create task</h3>
            </div>
            <p className="section-subtitle">Create a task directly inside an epic that already exists.</p>
            <form className="stack-form" onSubmit={handleQuickCreateTask}>
              <label className="field">
                <span>Title</span>
                <input
                  autoFocus
                  onChange={(event) => setQuickTaskTitle(event.target.value)}
                  placeholder="Clarify sprint board empty state"
                  value={quickTaskTitle}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  onChange={(event) => setQuickTaskDescription(event.target.value)}
                  placeholder="What should happen and why?"
                  value={quickTaskDescription}
                />
              </label>
              <label className="field">
                <span>Epic</span>
                <select onChange={(event) => setQuickTaskEpicId(event.target.value)} value={quickTaskEpicId}>
                  {(board?.epics ?? []).map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="toolbar-actions">
                <button className="button button-secondary" onClick={() => setIsQuickCreateOpen(false)} type="button">
                  Cancel
                </button>
                <button className="button button-primary" disabled={isBusy} type="submit">
                  Create task
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isCreateEpicOpen ? (
        <div aria-hidden={false} className="overlay-backdrop" role="presentation">
          <section aria-modal="true" className="confirmation-modal create-modal" role="dialog">
            <div className="detail-section-heading">
              <h3>Create epic</h3>
            </div>
            <form className="stack-form" onSubmit={handleCreateEpic}>
              <label className="field">
                <span>Epic title</span>
                <input autoFocus onChange={(event) => setEpicTitle(event.target.value)} value={epicTitle} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  onChange={(event) => setEpicDescription(event.target.value)}
                  placeholder="Describe the user outcome this epic supports."
                  value={epicDescription}
                />
              </label>
              <div className="toolbar-actions">
                <button className="button button-secondary" onClick={() => setIsCreateEpicOpen(false)} type="button">
                  Cancel
                </button>
                <button className="button button-primary" disabled={isBusy} type="submit">
                  Create epic
                </button>
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
    </>
  );
}

function OverviewView({
  activityEntries,
  board,
  documentationCount,
  onOpenBacklog,
  onOpenTask,
  sprintRecords,
}: {
  activityEntries: ActivityEntry[];
  board: Board | null;
  documentationCount: number;
  onOpenBacklog: () => void;
  onOpenTask: (taskId: string) => void;
  sprintRecords: TaskRecord[];
}) {
  const totalTasks = board?.epics.reduce((count, epic) => count + epic.tasks.length, 0) ?? 0;
  const completedTasks = board?.epics.reduce(
    (count, epic) => count + epic.tasks.filter((task) => task.status === "done").length,
    0,
  ) ?? 0;
  const sprintCompleted = sprintRecords.filter((record) => record.task.status === "done").length;

  return (
    <div className="overview-grid">
      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sprint</p>
            <h2>{board?.activeSprint?.name ?? "No active sprint"}</h2>
          </div>
          {!board?.activeSprint ? (
            <button className="button button-primary" onClick={onOpenBacklog} type="button">
              Open backlog
            </button>
          ) : null}
        </div>
        <div className="metric-pairs">
          <div className="metric-row">
            <span>Committed tasks</span>
            <strong>{sprintRecords.length}</strong>
          </div>
          <div className="metric-row">
            <span>Completed in sprint</span>
            <strong>{sprintCompleted}</strong>
          </div>
        </div>
        <div className="progress-stack">
          <div className="progress-row">
            <span>Sprint progress</span>
            <strong>
              {sprintRecords.length ? `${Math.round((sprintCompleted / sprintRecords.length) * 100)}%` : "0%"}
            </strong>
          </div>
          <div className="progress-bar large">
            <div style={{ width: `${sprintRecords.length ? (sprintCompleted / sprintRecords.length) * 100 : 0}%` }} />
          </div>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Backlog health</p>
            <h2>Current project state</h2>
          </div>
        </div>
        <div className="metric-pairs">
          <div className="metric-row">
            <span>Epics</span>
            <strong>{board?.epics.length ?? 0}</strong>
          </div>
          <div className="metric-row">
            <span>Total tasks</span>
            <strong>{totalTasks}</strong>
          </div>
          <div className="metric-row">
            <span>Done tasks</span>
            <strong>{completedTasks}</strong>
          </div>
          <div className="metric-row">
            <span>Docs</span>
            <strong>{documentationCount}</strong>
          </div>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Active sprint scope</p>
            <h2>Tasks in motion</h2>
          </div>
        </div>
        <div className="list-stack">
          {sprintRecords.length ? (
            sprintRecords.slice(0, 6).map((record) => (
              <button className="list-row-button" key={record.task.id} onClick={() => onOpenTask(record.task.id)} type="button">
                <div>
                  <strong>{record.task.title}</strong>
                  <small>{record.epic.title}</small>
                </div>
                <span className={`status-pill status-${record.task.status}`}>{taskStatusLabel(record.task.status)}</span>
              </button>
            ))
          ) : (
            <div className="empty-placeholder compact">
              <h3>No sprint tasks yet</h3>
              <p>Move tasks into a sprint from the planning view.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sprint history</p>
            <h2>Recent completed sprints</h2>
          </div>
        </div>
        <div className="history-list">
          {board?.sprintHistory.length ? (
            board.sprintHistory.slice(0, 4).map((sprint) => (
              <article className="history-card" key={sprint.id}>
                <div className="history-card-header">
                  <strong>{sprint.name}</strong>
                  <small>{formatSprintDate(sprint.completedAt)}</small>
                </div>
                <p>
                  {sprint.completedTasks}/{sprint.totalTasks} tasks done
                </p>
                <p>{sprint.retrospectiveNotes || "No retrospective notes captured."}</p>
              </article>
            ))
          ) : (
            <div className="empty-placeholder compact">
              <h3>No sprint history yet</h3>
              <p>Complete a sprint to preserve its snapshot and retrospective notes.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Activity log</p>
            <h2>Recent project activity</h2>
          </div>
        </div>
        <div className="history-list">
          {activityEntries.length ? (
            activityEntries.slice(0, 10).map((entry) => (
              <article className="history-card" key={entry.id}>
                <div className="history-card-header">
                  <strong>{entry.actor}</strong>
                  <small>{formatSprintDate(entry.createdAt)}</small>
                </div>
                <p>
                  {entry.action} on {entry.entityType}
                </p>
                {entry.details ? <p>{entry.details}</p> : null}
              </article>
            ))
          ) : (
            <div className="empty-placeholder compact">
              <h3>No activity recorded yet</h3>
              <p>Agent and human actions will appear here as they occur.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BacklogView({
  activeSprintId,
  backlogEpicFilter,
  backlogQuery,
  backlogSort,
  filteredBacklogRecords,
  selectedTaskIds,
  showCompletedTasks,
  onAddTaskToSprint,
  onBacklogDrop,
  onBulkAddToSprint,
  onBulkStatusChange,
  onCreateEpic,
  onDeleteTask,
  onDragTaskChange,
  onEpicFilterChange,
  onOpenTask,
  onQueryChange,
  onRemoveTaskFromSprint,
  onSelectedTaskIdsChange,
  onShowCompletedChange,
  onSortChange,
  projectEpics,
}: {
  activeSprintId: string | null;
  backlogEpicFilter: string;
  backlogQuery: string;
  backlogSort: BacklogSort;
  filteredBacklogRecords: TaskRecord[];
  selectedTaskIds: string[];
  showCompletedTasks: boolean;
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onBacklogDrop: (sourceTaskId: string, targetTaskId: string) => Promise<void>;
  onBulkAddToSprint: () => Promise<void>;
  onBulkStatusChange: (status: TaskStatus) => Promise<void>;
  onCreateEpic: () => void;
  onDeleteTask: (taskId: string) => void;
  onDragTaskChange: (taskId: string | null) => void;
  onEpicFilterChange: (value: string) => void;
  onOpenTask: (taskId: string) => void;
  onQueryChange: (value: string) => void;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
  onSelectedTaskIdsChange: (ids: string[]) => void;
  onShowCompletedChange: (value: boolean) => void;
  onSortChange: (value: BacklogSort) => void;
  projectEpics: Epic[];
}) {
  function toggleTask(taskId: string) {
    onSelectedTaskIdsChange(
      selectedTaskIds.includes(taskId)
        ? selectedTaskIds.filter((value) => value !== taskId)
        : [...selectedTaskIds, taskId],
    );
  }

  return (
    <div className="panel-stack">
      <section className="panel-section sticky-toolbar">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Backlog</p>
            <h2>Search, sort, reorder, and move tasks into the sprint.</h2>
          </div>
          <button className="button button-secondary" onClick={onCreateEpic} type="button">
            Create epic
          </button>
        </div>

        <div className="filter-grid">
          <label className="field grow-field">
            <span>Search</span>
            <input
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search titles, descriptions, and epics"
              value={backlogQuery}
            />
          </label>
          <label className="field">
            <span>Epic</span>
            <select onChange={(event) => onEpicFilterChange(event.target.value)} value={backlogEpicFilter}>
              <option value="all">All epics</option>
              {projectEpics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Order by</span>
            <select onChange={(event) => onSortChange(event.target.value as BacklogSort)} value={backlogSort}>
              <option value="backlog">Backlog order</option>
              <option value="title">Task name</option>
              <option value="epic">Epic</option>
              <option value="status">Status</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input
              checked={showCompletedTasks}
              onChange={(event) => onShowCompletedChange(event.target.checked)}
              type="checkbox"
            />
            <span>Show completed</span>
          </label>
        </div>

        {selectedTaskIds.length ? (
          <div className="bulk-bar">
            <strong>{selectedTaskIds.length} selected</strong>
            <div className="toolbar-actions">
              <button className="button button-secondary" onClick={() => void onBulkStatusChange("todo")} type="button">
                Mark to do
              </button>
              <button
                className="button button-secondary"
                onClick={() => void onBulkStatusChange("in_progress")}
                type="button"
              >
                Mark in progress
              </button>
              <button className="button button-secondary" onClick={() => void onBulkStatusChange("done")} type="button">
                Mark done
              </button>
              {activeSprintId ? (
                <button className="button button-primary" onClick={() => void onBulkAddToSprint()} type="button">
                  Add to sprint
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel-section table-panel">
        <div className="task-table">
          <div className="task-table-head">
            <span />
            <span>Task</span>
            <span>Status</span>
            <span>Epic</span>
            <span>Sprint</span>
            <span>Position</span>
            <span>Actions</span>
          </div>

          {filteredBacklogRecords.length ? (
            filteredBacklogRecords.map((record) => (
              <div
                className={`task-table-row${selectedTaskIds.includes(record.task.id) ? " selected" : ""}`}
                draggable={backlogSort === "backlog"}
                key={record.task.id}
                onDragOver={(event) => {
                  if (backlogSort === "backlog") {
                    event.preventDefault();
                  }
                }}
                onDragStart={() => onDragTaskChange(record.task.id)}
              >
                <span className="row-select">
                  <button className="drag-handle" type="button">
                    <Icon name="grip" />
                  </button>
                  <input
                    checked={selectedTaskIds.includes(record.task.id)}
                    onChange={() => toggleTask(record.task.id)}
                    type="checkbox"
                  />
                </span>
                <button
                  className="task-primary-cell"
                  onClick={() => onOpenTask(record.task.id)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = (event.dataTransfer.getData("text/plain") || "").trim();
                    if (sourceId) {
                      void onBacklogDrop(sourceId, record.task.id);
                    }
                  }}
                  type="button"
                >
                  <strong>{record.task.title}</strong>
                  <small>{record.task.description || "No description yet"}</small>
                </button>
                <span className={`status-pill status-${record.task.status}`}>{taskStatusLabel(record.task.status)}</span>
                <span>{record.epic.title}</span>
                <span>{record.task.sprintId === activeSprintId && activeSprintId ? "Active" : "Backlog"}</span>
                <span>Task {record.task.position + 1}</span>
                <div className="row-actions">
                  {activeSprintId ? (
                    record.task.sprintId === activeSprintId ? (
                      <button className="ghost-button compact-button" onClick={() => void onRemoveTaskFromSprint(record.task.id)} type="button">
                        Remove
                      </button>
                    ) : (
                      <button className="ghost-button compact-button" onClick={() => void onAddTaskToSprint(record.task.id)} type="button">
                        Add
                      </button>
                    )
                  ) : null}
                  <button className="ghost-button compact-button" onClick={() => onOpenTask(record.task.id)} type="button">
                    Open
                  </button>
                  <button className="ghost-button compact-button danger-text" onClick={() => onDeleteTask(record.task.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-placeholder">
              <h3>No tasks match the current view</h3>
              <p>Widen the search, change the filters, or create work under an epic.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PlanningView({
  activeSprint,
  backlogRecords,
  retrospectiveNotesDraft,
  sprintName,
  sprintRecords,
  onAddTaskToSprint,
  onOpenTask,
  onRemoveTaskFromSprint,
  onRetrospectiveNotesChange,
  onSaveRetrospectiveNotes,
  onSprintNameChange,
  onStartSprint,
}: {
  activeSprint: Board["activeSprint"];
  backlogRecords: TaskRecord[];
  retrospectiveNotesDraft: string;
  sprintName: string;
  sprintRecords: TaskRecord[];
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onOpenTask: (taskId: string) => void;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
  onRetrospectiveNotesChange: (value: string) => void;
  onSaveRetrospectiveNotes: () => Promise<void>;
  onSprintNameChange: (value: string) => void;
  onStartSprint: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="planning-grid">
      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sprint setup</p>
            <h2>{activeSprint?.name ?? "Start the next sprint"}</h2>
          </div>
        </div>

        {activeSprint ? (
          <div className="stack-form">
            <div className="metric-pairs">
              <div className="metric-row">
                <span>Tasks in sprint</span>
                <strong>{sprintRecords.length}</strong>
              </div>
              <div className="metric-row">
                <span>Done in sprint</span>
                <strong>{sprintRecords.filter((record) => record.task.status === "done").length}</strong>
              </div>
            </div>
            <label className="field">
              <span>Retrospective notes</span>
              <textarea
                onChange={(event) => onRetrospectiveNotesChange(event.target.value)}
                placeholder="What worked well, what should change, and what this sprint delivered."
                value={retrospectiveNotesDraft}
              />
            </label>
            <div className="toolbar-actions">
              <button className="button button-secondary" onClick={() => void onSaveRetrospectiveNotes()} type="button">
                Save notes
              </button>
            </div>
          </div>
        ) : (
          <form className="stack-form" onSubmit={onStartSprint}>
            <label className="field">
              <span>Sprint name</span>
              <input onChange={(event) => onSprintNameChange(event.target.value)} placeholder="Sprint 1" value={sprintName} />
            </label>
            <button className="button button-primary" type="submit">
              Start sprint
            </button>
          </form>
        )}
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Backlog candidates</p>
            <h2>Move work into the sprint</h2>
          </div>
        </div>
        <div className="list-stack">
          {backlogRecords.length ? (
            backlogRecords.map((record) => (
              <div className="list-row" key={record.task.id}>
                <button className="list-row-button grow-button" onClick={() => onOpenTask(record.task.id)} type="button">
                  <div>
                    <strong>{record.task.title}</strong>
                    <small>{record.epic.title}</small>
                  </div>
                  <span className={`status-pill status-${record.task.status}`}>{taskStatusLabel(record.task.status)}</span>
                </button>
                <button className="button button-secondary" onClick={() => void onAddTaskToSprint(record.task.id)} type="button">
                  Add
                </button>
              </div>
            ))
          ) : (
            <div className="empty-placeholder compact">
              <h3>No backlog tasks available</h3>
              <p>Everything is already in the sprint or the project has no tasks yet.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sprint scope</p>
            <h2>Current sprint tasks</h2>
          </div>
        </div>
        <div className="list-stack">
          {sprintRecords.length ? (
            sprintRecords.map((record) => (
              <div className="list-row" key={record.task.id}>
                <button className="list-row-button grow-button" onClick={() => onOpenTask(record.task.id)} type="button">
                  <div>
                    <strong>{record.task.title}</strong>
                    <small>{record.epic.title}</small>
                  </div>
                  <span className={`status-pill status-${record.task.status}`}>{taskStatusLabel(record.task.status)}</span>
                </button>
                <button className="button button-secondary" onClick={() => void onRemoveTaskFromSprint(record.task.id)} type="button">
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="empty-placeholder compact">
              <h3>No tasks in the sprint</h3>
              <p>Add backlog work here before execution starts.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Completed sprints</p>
            <h2>History stays preserved</h2>
          </div>
        </div>
        <div className="empty-placeholder compact">
          <h3>Retrospective notes</h3>
          <p>Notes are attached to the active sprint and preserved when the sprint is completed.</p>
        </div>
      </section>
    </div>
  );
}

function BoardView({
  activeSprint,
  boardColumns,
  dragTaskId,
  onDragTaskChange,
  onOpenTask,
  onTaskDrop,
}: {
  activeSprint: Board["activeSprint"];
  boardColumns: Array<{ key: TaskStatus; title: string; tasks: SprintTask[] }>;
  dragTaskId: string | null;
  onDragTaskChange: (taskId: string | null) => void;
  onOpenTask: (taskId: string) => void;
  onTaskDrop: (taskId: string, status: TaskStatus) => void;
}) {
  return activeSprint ? (
    <div className="panel-stack">
      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sprint board</p>
            <h2>{activeSprint.name}</h2>
          </div>
        </div>

        <div className="board-grid">
          {boardColumns.map((column) => (
            <section
              className="board-column"
              key={column.key}
              onDragOver={(event) => {
                if (dragTaskId) {
                  event.preventDefault();
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragTaskId) {
                  onTaskDrop(dragTaskId, column.key);
                  onDragTaskChange(null);
                }
              }}
            >
              <div className="board-column-header">
                <div>
                  <h3>{column.title}</h3>
                  <small>{column.tasks.length} tasks</small>
                </div>
              </div>

              <div className="board-card-list">
                {column.tasks.length ? (
                  column.tasks.map((task) => (
                    <button
                      className="kanban-card"
                      draggable
                      key={task.id}
                      onClick={() => onOpenTask(task.id)}
                      onDragStart={(event) => {
                        onDragTaskChange(task.id);
                        event.dataTransfer.setData("text/plain", task.id);
                      }}
                      type="button"
                    >
                      <div className="kanban-card-top">
                        <span className={`status-pill status-${task.status}`}>{taskStatusLabel(task.status)}</span>
                      </div>
                      <strong>{task.title}</strong>
                      <p>{task.epicTitle}</p>
                      <div className="kanban-card-footer">
                        <span>{task.description ? "Has description" : "No description"}</span>
                        <span>Task {task.position + 1}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty-placeholder compact">
                    <h3>No tasks</h3>
                    <p>Drag tasks here to update their status.</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-placeholder">
      <h3>No active sprint</h3>
      <p>Start a sprint from the planning view to populate the execution board.</p>
    </div>
  );
}

function DocumentationView({
  activeDirectoryPath,
  directoryName,
  documentation,
  pageName,
  selectedDocumentationContent,
  selectedDocumentationName,
  selectedDocumentationNode,
  selectedPage,
  onCreateDirectory,
  onCreatePage,
  onDelete,
  onDirectoryNameChange,
  onPageNameChange,
  onSave,
  onSelectedContentChange,
  onSelectedNameChange,
  onSelectNode,
}: {
  activeDirectoryPath: string;
  directoryName: string;
  documentation: Documentation | null;
  pageName: string;
  selectedDocumentationContent: string;
  selectedDocumentationName: string;
  selectedDocumentationNode: DocumentationNode | null;
  selectedPage: DocumentationNode | null;
  onCreateDirectory: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreatePage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: () => void;
  onDirectoryNameChange: (value: string) => void;
  onPageNameChange: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSelectedContentChange: (value: string) => void;
  onSelectedNameChange: (value: string) => void;
  onSelectNode: (nodeId: string | null) => void;
}) {
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const filteredNodes = useMemo(() => {
    if (!docSearchQuery.trim() || !documentation) return documentation?.nodes ?? [];

    const query = docSearchQuery.toLowerCase();
    function filterRecursive(nodes: DocumentationNode[]): DocumentationNode[] {
      return nodes
        .map((node) => {
          const nameMatch = node.name.toLowerCase().includes(query);
          const contentMatch = node.content?.toLowerCase().includes(query) ?? false;
          const children = node.kind === "directory" ? filterRecursive(node.children) : [];
          const hasMatchingChild = children.length > 0;

          if (nameMatch || contentMatch || hasMatchingChild) {
            return { ...node, children };
          }

          return null;
        })
        .filter((node): node is DocumentationNode => node !== null);
    }

    return filterRecursive(documentation.nodes);
  }, [docSearchQuery, documentation]);

  return (
    <div className="docs-grid">
      <aside className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Documentation</p>
            <h2>{activeDirectoryPath}</h2>
          </div>
        </div>
        <div className="field">
          <input
            onChange={(event) => setDocSearchQuery(event.target.value)}
            placeholder="Filter tree..."
            value={docSearchQuery}
          />
        </div>
        <div className="doc-tree">
          {filteredNodes.length ? (
            renderDocumentationTree(filteredNodes, onSelectNode, selectedDocumentationNode?.id ?? null)
          ) : (
            <div className="empty-placeholder compact">
              <h3>No pages yet</h3>
              <p>Create the first page or directory for this project.</p>
            </div>
          )}
        </div>
        <div className="stack-form">
          <form className="inline-input-row" onSubmit={onCreateDirectory}>
            <input
              onChange={(event) => onDirectoryNameChange(event.target.value)}
              placeholder="New directory"
              value={directoryName}
            />
            <button className="button button-secondary" type="submit">
              Add
            </button>
          </form>
          <form className="inline-input-row" onSubmit={onCreatePage}>
            <input onChange={(event) => onPageNameChange(event.target.value)} placeholder="New page" value={pageName} />
            <button className="button button-primary" type="submit">
              Add
            </button>
          </form>
        </div>
      </aside>

      <section className="panel-section">
        {selectedDocumentationNode ? (
          <form className="stack-form" onSubmit={onSave}>
            <div className="section-heading-row">
              <div>
                <p className="section-kicker">{selectedDocumentationNode.kind === "page" ? "Markdown page" : "Directory"}</p>
                <h2>{selectedDocumentationNode.path}</h2>
              </div>
              <div className="toolbar-actions">
                {selectedPage ? (
                  <button
                    className="button button-secondary"
                    onClick={() => setPreviewMode(!previewMode)}
                    type="button"
                  >
                    {previewMode ? "Edit" : "Preview"}
                  </button>
                ) : null}
                <button className="button button-danger" onClick={onDelete} type="button">
                  Delete
                </button>
              </div>
            </div>
            <label className="field">
              <span>Name</span>
              <input onChange={(event) => onSelectedNameChange(event.target.value)} value={selectedDocumentationName} />
            </label>
            {selectedPage ? (
              previewMode ? (
                <div className="field">
                  <span>Preview</span>
                  <div className="doc-preview">
                    {renderSimpleMarkdown(selectedDocumentationContent)}
                  </div>
                </div>
              ) : (
                <label className="field">
                  <span>Markdown</span>
                  <textarea
                    className="doc-editor"
                    onChange={(event) => onSelectedContentChange(event.target.value)}
                    placeholder="# Product vision"
                    value={selectedDocumentationContent}
                  />
                </label>
              )
            ) : (
              <div className="empty-placeholder compact">
                <h3>Directory selected</h3>
                <p>Create child pages from the left panel or rename this directory here.</p>
              </div>
            )}
            <div className="toolbar-actions">
              <button className="button button-primary" type="submit">
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="empty-placeholder">
            <h3>Select documentation</h3>
            <p>Choose a page or directory from the tree to start editing.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function renderSimpleMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`} className="md-code-block">
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      elements.push(<br key={`br-${index}`} />);
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h4 key={`h3-${index}`}>{line.slice(4)}</h4>);
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(<h3 key={`h2-${index}`}>{line.slice(3)}</h3>);
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(<h2 key={`h1-${index}`}>{line.slice(2)}</h2>);
      continue;
    }

    if (line.startsWith("- ")) {
      elements.push(
        <li key={`li-${index}`} className="md-list-item">
          {line.slice(2)}
        </li>,
      );
      continue;
    }

    elements.push(<p key={`p-${index}`}>{line}</p>);
  }

  return <div className="md-preview-content">{elements}</div>;
}

function findDocumentationNode(nodes: DocumentationNode[], nodeId: string | null): DocumentationNode | null {
  if (!nodeId) {
    return null;
  }

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

function findFirstPageNode(nodes: DocumentationNode[]): DocumentationNode | null {
  for (const node of nodes) {
    if (node.kind === "page") {
      return node;
    }

    const nested = findFirstPageNode(node.children);
    if (nested) {
      return nested;
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

function taskStatusLabel(status: TaskStatus) {
  return status === "in_progress" ? "In progress" : status === "done" ? "Done" : "To do";
}

function renderDocumentationTree(
  nodes: DocumentationNode[],
  onSelect: (nodeId: string | null) => void,
  selectedNodeId: string | null,
  depth = 0,
): ReactNode[] {
  return nodes.flatMap((node) => [
    <button
      className={`doc-tree-node${selectedNodeId === node.id ? " active" : ""}`}
      key={node.id}
      onClick={() => onSelect(node.id)}
      style={{ paddingLeft: `${12 + depth * 18}px` }}
      type="button"
    >
      <span className="doc-tree-bullet">{node.kind === "directory" ? "Dir" : "Page"}</span>
      <span>{node.name}</span>
    </button>,
    ...(node.kind === "directory" ? renderDocumentationTree(node.children, onSelect, selectedNodeId, depth + 1) : []),
  ]);
}

function sortBacklogTaskRows(rows: TaskRecord[], sort: BacklogSort) {
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
      const diff = taskStatusOrder[left.task.status] - taskStatusOrder[right.task.status];
      if (diff !== 0) {
        return diff;
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
