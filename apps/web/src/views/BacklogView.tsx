import { useState, useMemo } from "react";
import type { Epic } from "../types";
import type { TaskRecord, BacklogSort, TaskStatus } from "../utils";
import { taskStatusLabel, sortBacklogTaskRows } from "../utils";
import { Icon } from "../components/icons";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

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
          <Button onClick={onCreateEpic} type="button" variant="secondary">Create epic</Button>
        </div>

        <div className="filter-grid">
          <label className="field grow-field">
            <span>Search</span>
            <Input onChange={(e) => onQueryChange(e.target.value)} placeholder="Search titles, descriptions, and epics" value={query} />
          </label>
          <label className="field">
            <span>Epic</span>
            <Select onValueChange={onEpicFilterChange} value={epicFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All epics</SelectItem>
              {projectEpics.map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>{epic.title}</SelectItem>
              ))}
              </SelectContent>
            </Select>
          </label>
          <label className="field">
            <span>Order by</span>
            <Select onValueChange={(value) => onSortChange(value as BacklogSort)} value={sort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog order</SelectItem>
                <SelectItem value="title">Task name</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
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
              <Button onClick={() => void onBulkStatusChange("todo")} type="button" variant="secondary">Mark to do</Button>
              <Button onClick={() => void onBulkStatusChange("in_progress")} type="button" variant="secondary">Mark in progress</Button>
              <Button onClick={() => void onBulkStatusChange("done")} type="button" variant="secondary">Mark done</Button>
              {activeSprintId ? (
                <Button onClick={() => void onBulkAddToSprint()} type="button">Add to sprint</Button>
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
                              <Button className="compact-button" onClick={() => void onRemoveTaskFromSprint(record.task.id)} type="button" variant="ghost">Remove</Button>
                            ) : (
                              <Button className="compact-button" onClick={() => void onAddTaskToSprint(record.task.id)} type="button" variant="ghost">Add</Button>
                            )
                          ) : null}
                          <Button className="compact-button" onClick={() => onOpenTask(record.task.id)} type="button" variant="ghost">Open</Button>
                          <Button className="compact-button danger-text" onClick={() => onDeleteTask(record.task.id)} type="button" variant="ghost">Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="epic-quick-add">
                    {quickAddEpicId === group.epic.id ? (
                      <div className="inline-input-row">
                        <Input
                          autoFocus
                          onChange={(e) => setQuickAddTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleQuickAdd(group.epic.id); } }}
                          placeholder="Task title"
                          value={quickAddTitle}
                        />
                        <Button disabled={isAddingTask || !quickAddTitle.trim()} onClick={() => void handleQuickAdd(group.epic.id)} type="button">Add</Button>
                        <Button onClick={() => { setQuickAddEpicId(""); setQuickAddTitle(""); }} type="button" variant="ghost">Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setQuickAddEpicId(group.epic.id)} type="button" variant="ghost">+ Add task</Button>
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
            action={<Button onClick={onCreateEpic} type="button">Create epic</Button>}
          />
        )}
      </section>
    </div>
  );
}
