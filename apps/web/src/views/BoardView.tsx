import { useState, useCallback } from "react";
import type { SprintTask, Sprint } from "../types";
import type { TaskStatus } from "../utils";
import { taskStatusLabel } from "../utils";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";

type BoardViewProps = {
  activeSprint: Sprint | null;
  sprintTasks: SprintTask[];
  onOpenTask: (taskId: string) => void;
  onTaskDrop: (taskId: string, status: TaskStatus) => void;
};

export function BoardView({ activeSprint, sprintTasks, onOpenTask, onTaskDrop }: BoardViewProps) {
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Array<{ key: string; title: string }>>([
    { key: "todo", title: "To do" },
    { key: "in_progress", title: "In progress" },
    { key: "in_review", title: "In review" },
    { key: "done", title: "Done" },
  ]);
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  const statusMap: Record<string, TaskStatus> = {
    todo: "todo",
    in_progress: "in_progress",
    in_review: "in_progress",
    done: "done",
  };

  const getTasksForColumn = useCallback(
    (columnKey: string) => {
      let tasks = sprintTasks;
      if (query.trim()) {
        const q = query.toLowerCase();
        tasks = tasks.filter((t) => `${t.title} ${t.epicTitle} ${t.description}`.toLowerCase().includes(q));
      }
      if (assigneeFilter !== "all") {
        tasks = tasks.filter((t) => (assigneeFilter === "unclaimed" ? !t.claimedBy : t.claimedBy === assigneeFilter));
      }
      if (columnKey === "todo") return tasks.filter((t) => t.status === "todo");
      if (columnKey === "done") return tasks.filter((t) => t.status === "done");
      if (columnKey === "in_review") return tasks.filter((t) => t.status === "in_progress" && t.description?.includes("[review]"));
      return tasks.filter((t) => t.status === "in_progress" && !t.description?.includes("[review]"));
    },
    [assigneeFilter, query, sprintTasks],
  );
  const assignees = Array.from(new Set(sprintTasks.map((t) => t.claimedBy).filter(Boolean))) as string[];

  function handleAddColumn() {
    const key = `col_${Date.now()}`;
    setColumns((prev) => [...prev, { key, title: "New column" }]);
  }

  function handleRenameColumn(key: string) {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, title: editingColumnName } : c)));
    setEditingColumnKey(null);
    setEditingColumnName("");
  }

  function handleRemoveColumn(key: string) {
    setColumns((prev) => prev.filter((c) => c.key !== key));
  }

  function handleDrop(taskId: string, columnKey: string) {
    const status = statusMap[columnKey];
    if (status) {
      onTaskDrop(taskId, status);
    }
    setDragTaskId(null);
  }

  if (!activeSprint) {
    return (
      <EmptyState
        title="No active sprint"
        message="Start a sprint from the planning view to populate the execution board."
        action={<button className="button button-primary" onClick={() => window.history.pushState({}, "", "?view=planning")} type="button">Go to planning</button>}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="panel-stack">
        <section className="panel-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Sprint board</p>
              <h2>{activeSprint.name}</h2>
            </div>
            <button className="button button-secondary" onClick={() => setShowColumnConfig(!showColumnConfig)} type="button">
              Configure columns
            </button>
          </div>
          <div className="board-toolbar">
            <label className="field grow-field">
              <span>Find task</span>
              <input onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, epic, or description" value={query} />
            </label>
            <label className="field">
              <span>Owner</span>
              <select onChange={(e) => setAssigneeFilter(e.target.value)} value={assigneeFilter}>
                <option value="all">All owners</option>
                <option value="unclaimed">Unclaimed</option>
                {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>

          {showColumnConfig ? (
            <div className="column-config">
              {columns.map((col) => (
                <div className="inline-input-row" key={col.key}>
                  {editingColumnKey === col.key ? (
                    <>
                      <input
                        autoFocus
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameColumn(col.key); }}
                        value={editingColumnName}
                      />
                      <button className="button button-primary" onClick={() => handleRenameColumn(col.key)} type="button">Save</button>
                      <button className="ghost-button" onClick={() => { setEditingColumnKey(null); setEditingColumnName(""); }} type="button">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="column-config-name">{col.title}</span>
                      <button className="ghost-button" onClick={() => { setEditingColumnKey(col.key); setEditingColumnName(col.title); }} type="button">Rename</button>
                      {columns.length > 2 ? (
                        <button className="ghost-button danger-text" onClick={() => handleRemoveColumn(col.key)} type="button">Remove</button>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              <button className="button button-secondary" onClick={handleAddColumn} type="button">+ Add column</button>
            </div>
          ) : null}

          <div className="board-grid">
            {columns.map((column) => {
              const columnTasks = getTasksForColumn(column.key);
              const wipLimit = wipLimits[column.key];
              const isOverWip = wipLimit && columnTasks.length > wipLimit;

              return (
                <section
                  className={`board-column${isOverWip ? " over-wip" : ""}`}
                  key={column.key}
                  onDragOver={(e) => { if (dragTaskId) e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragTaskId) handleDrop(dragTaskId, column.key);
                  }}
                >
                  <div className="board-column-header">
                    <div>
                      <h3>{column.title}</h3>
                      <small>{columnTasks.length}{wipLimit ? ` / ${wipLimit}` : ""} tasks</small>
                    </div>
                    {isOverWip ? <span className="wip-warning">Over WIP limit</span> : null}
                  </div>

                  <div className="board-card-list">
                    {columnTasks.length ? (
                      columnTasks.map((task) => (
                        <button
                          className="kanban-card"
                          draggable
                          key={task.id}
                          onClick={() => onOpenTask(task.id)}
                          onDragStart={(e) => {
                            setDragTaskId(task.id);
                            e.dataTransfer.setData("text/plain", task.id);
                          }}
                          type="button"
                        >
                          <div className="kanban-card-top">
                            <span className={`status-pill status-${task.status}`}>{taskStatusLabel(task.status)}</span>
                          </div>
                          <strong>{task.title}</strong>
                          <p style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>{task.epicTitle}</p>
                          <div className="kanban-card-footer">
                            {task.claimedBy ? (
                              <span className="claimed-badge">{task.claimedBy}</span>
                            ) : (
                              <span>Unclaimed</span>
                            )}
                            <small>#{task.position + 1}</small>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="empty-placeholder compact">
                        <h3>No tasks</h3>
                        <p>Drag tasks here</p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}
