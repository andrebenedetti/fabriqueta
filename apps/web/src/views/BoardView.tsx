import { useState, useCallback } from "react";
import type { SprintTask, Sprint } from "../types";
import type { TaskStatus } from "../utils";
import { taskStatusLabel } from "../utils";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

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
      if (columnKey === "todo") return sprintTasks.filter((t) => t.status === "todo");
      if (columnKey === "done") return sprintTasks.filter((t) => t.status === "done");
      if (columnKey === "in_review") return sprintTasks.filter((t) => t.status === "in_progress" && t.description?.includes("[review]"));
      return sprintTasks.filter((t) => t.status === "in_progress" && !t.description?.includes("[review]"));
    },
    [sprintTasks],
  );

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
        action={<Button onClick={() => window.history.pushState({}, "", "?view=planning")} type="button">Go to planning</Button>}
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
            <Button onClick={() => setShowColumnConfig(!showColumnConfig)} type="button" variant="secondary">
              Configure columns
            </Button>
          </div>

          {showColumnConfig ? (
            <div className="column-config">
              {columns.map((col) => (
                <div className="inline-input-row" key={col.key}>
                  {editingColumnKey === col.key ? (
                    <>
                      <Input
                        autoFocus
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameColumn(col.key); }}
                        value={editingColumnName}
                      />
                      <Button onClick={() => handleRenameColumn(col.key)} type="button">Save</Button>
                      <Button onClick={() => { setEditingColumnKey(null); setEditingColumnName(""); }} type="button" variant="ghost">Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="column-config-name">{col.title}</span>
                      <Button onClick={() => { setEditingColumnKey(col.key); setEditingColumnName(col.title); }} type="button" variant="ghost">Rename</Button>
                      {columns.length > 2 ? (
                        <Button className="danger-text" onClick={() => handleRemoveColumn(col.key)} type="button" variant="ghost">Remove</Button>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              <Button onClick={handleAddColumn} type="button" variant="secondary">+ Add column</Button>
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
