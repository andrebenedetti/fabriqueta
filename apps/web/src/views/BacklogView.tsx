import { useState, useMemo } from "react";
import type { Epic } from "../types";
import type { TaskRecord, BacklogSort, TaskStatus } from "../utils";
import { taskStatusLabel, sortBacklogTaskRows } from "../utils";
import { Icon } from "../components/icons";
import { EmptyState } from "../components/ui/EmptyState";

type BacklogViewProps = {
  activeSprintId: string | null;
  epicFilter: string;
  query: string;
  sort: BacklogSort;
  showCompleted: boolean;
  projectEpics: Epic[];
  taskRecords: TaskRecord[];
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onBulkAddToSprint: () => Promise<void>;
  onBulkStatusChange: (status: TaskStatus) => Promise<void>;
  onCreateEpic: () => void;
  onCreateTask: (epicId: string, title: string) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  onEpicFilterChange: (value: string) => void;
  onOpenTask: (taskId: string) => void;
  onQueryChange: (value: string) => void;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
  onShowCompletedChange: (value: boolean) => void;
  onSortChange: (value: BacklogSort) => void;
};

export function BacklogView({
  activeSprintId,
  epicFilter,
  query,
  sort,
  showCompleted,
  projectEpics,
  taskRecords,
  onAddTaskToSprint,
  onBulkAddToSprint,
  onBulkStatusChange,
  onCreateEpic,
  onCreateTask,
  onDeleteTask,
  onEpicFilterChange,
  onOpenTask,
  onQueryChange,
  onRemoveTaskFromSprint,
  onShowCompletedChange,
  onSortChange,
}: BacklogViewProps) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
  const [quickAddEpicId, setQuickAddEpicId] = useState<string>("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortBacklogTaskRows(
      taskRecords.filter(({ epic, task }) => {
        if (!showCompleted && task.status === "done") return false;
        if (epicFilter !== "all" && epic.id !== epicFilter) return false;
        if (!q) return true;
        return `${task.title} ${task.description} ${epic.title}`.toLowerCase().includes(q);
      }),
      sort,
    );
  }, [epicFilter, query, sort, showCompleted, taskRecords]);

  const groupedByEpic = useMemo(() => {
    const groups = new Map<string, { epic: { id: string; title: string }; tasks: TaskRecord[] }>();
    for (const record of filteredRecords) {
      const key = record.epic.id;
      if (!groups.has(key)) groups.set(key, { epic: record.epic, tasks: [] });
      groups.get(key)!.tasks.push(record);
    }
    return Array.from(groups.values());
  }, [filteredRecords]);

  function toggleTask(taskId: string) {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  }

  function toggleSelectAll() {
    if (selectedTaskIds.length === filteredRecords.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredRecords.map((r) => r.task.id));
    }
  }

  function toggleEpicCollapse(epicId: string) {
    setCollapsedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  }

  async function handleQuickAdd(epicId: string) {
    if (!quickAddTitle.trim()) return;
    setIsAddingTask(true);
    await onCreateTask(epicId, quickAddTitle.trim());
    setQuickAddTitle("");
    setQuickAddEpicId("");
    setIsAddingTask(false);
  }

  return (
    <div className="panel-stack">
      <section className="panel-section sticky-toolbar">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Backlog</p>
            <h2>Search, sort, and manage backlog tasks</h2>
          </div>
          <button className="button button-secondary" onClick={onCreateEpic} type="button">Create epic</button>
        </div>

        <div className="filter-grid">
          <label className="field grow-field">
            <span>Search</span>
            <input onChange={(e) => onQueryChange(e.target.value)} placeholder="Search titles, descriptions, and epics" value={query} />
          </label>
          <label className="field">
            <span>Epic</span>
            <select onChange={(e) => onEpicFilterChange(e.target.value)} value={epicFilter}>
              <option value="all">All epics</option>
              {projectEpics.map((epic) => (
                <option key={epic.id} value={epic.id}>{epic.title}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Order by</span>
            <select onChange={(e) => onSortChange(e.target.value as BacklogSort)} value={sort}>
              <option value="backlog">Backlog order</option>
              <option value="title">Task name</option>
              <option value="epic">Epic</option>
              <option value="status">Status</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input checked={showCompleted} onChange={(e) => onShowCompletedChange(e.target.checked)} type="checkbox" />
            <span>Show completed</span>
          </label>
        </div>

        {selectedTaskIds.length ? (
          <div className="bulk-bar">
            <strong>{selectedTaskIds.length} selected</strong>
            <div className="toolbar-actions">
              <button className="button button-secondary" onClick={() => void onBulkStatusChange("todo")} type="button">Mark to do</button>
              <button className="button button-secondary" onClick={() => void onBulkStatusChange("in_progress")} type="button">Mark in progress</button>
              <button className="button button-secondary" onClick={() => void onBulkStatusChange("done")} type="button">Mark done</button>
              {activeSprintId ? (
                <button className="button button-primary" onClick={() => void onBulkAddToSprint()} type="button">Add to sprint</button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel-section table-panel">
        {groupedByEpic.length ? (
          groupedByEpic.map((group) => (
            <div className="epic-group" key={group.epic.id}>
              <button
                className="epic-group-header"
                onClick={() => toggleEpicCollapse(group.epic.id)}
                type="button"
              >
                <Icon name="chevron-right" />
                <strong>{group.epic.title}</strong>
                <small>{group.tasks.length} tasks</small>
              </button>

              {!collapsedEpics.has(group.epic.id) ? (
                <>
                  <div className="task-table">
                    <div className="task-table-head">
                      <span><input checked={group.tasks.every((t) => selectedTaskIds.includes(t.task.id))} onChange={toggleSelectAll} type="checkbox" /></span>
                      <span>Task</span>
                      <span>Status</span>
                      <span>Sprint</span>
                      <span>Actions</span>
                    </div>
                    {group.tasks.map((record) => (
                      <div className={`task-table-row${selectedTaskIds.includes(record.task.id) ? " selected" : ""}`} key={record.task.id}>
                        <span className="row-select">
                          <input checked={selectedTaskIds.includes(record.task.id)} onChange={() => toggleTask(record.task.id)} type="checkbox" />
                        </span>
                        <button className="task-primary-cell" onClick={() => onOpenTask(record.task.id)} type="button">
                          <strong>{record.task.title}</strong>
                          <small>{record.task.description || "No description yet"}</small>
                        </button>
                        <span className={`status-pill status-${record.task.status}`}>{taskStatusLabel(record.task.status)}</span>
                        <span>{record.task.sprintId === activeSprintId && activeSprintId ? "Active" : "Backlog"}</span>
                        <div className="row-actions">
                          {activeSprintId ? (
                            record.task.sprintId === activeSprintId ? (
                              <button className="ghost-button compact-button" onClick={() => void onRemoveTaskFromSprint(record.task.id)} type="button">Remove</button>
                            ) : (
                              <button className="ghost-button compact-button" onClick={() => void onAddTaskToSprint(record.task.id)} type="button">Add</button>
                            )
                          ) : null}
                          <button className="ghost-button compact-button" onClick={() => onOpenTask(record.task.id)} type="button">Open</button>
                          <button className="ghost-button compact-button danger-text" onClick={() => onDeleteTask(record.task.id)} type="button">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="epic-quick-add">
                    {quickAddEpicId === group.epic.id ? (
                      <div className="inline-input-row">
                        <input
                          autoFocus
                          onChange={(e) => setQuickAddTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleQuickAdd(group.epic.id); } }}
                          placeholder="Task title"
                          value={quickAddTitle}
                        />
                        <button className="button button-primary" disabled={isAddingTask || !quickAddTitle.trim()} onClick={() => void handleQuickAdd(group.epic.id)} type="button">Add</button>
                        <button className="ghost-button" onClick={() => { setQuickAddEpicId(""); setQuickAddTitle(""); }} type="button">Cancel</button>
                      </div>
                    ) : (
                      <button className="ghost-button" onClick={() => setQuickAddEpicId(group.epic.id)} type="button">+ Add task</button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState
            title="No tasks match the current view"
            message="Widen the search, change the filters, or create work under an epic."
            action={<button className="button button-primary" onClick={onCreateEpic} type="button">Create epic</button>}
          />
        )}
      </section>
    </div>
  );
}
