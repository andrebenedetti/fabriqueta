import { FormEvent, useEffect, useState } from "react";
import type { Task, TaskStatus } from "../types";

type TaskDetailsDialogProps = {
  activeSprintId: string | null;
  epicTitle: string;
  isMutating: boolean;
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onClose: () => void;
  onDeleteTask: () => void;
  onMoveTask: (taskId: string, direction: "up" | "down") => Promise<void>;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
  onSaveTask: (
    taskId: string,
    input: { title: string; description?: string; status?: TaskStatus },
  ) => Promise<void>;
  task: Task;
};

function lifecycleCopy(task: Task, activeSprintId: string | null) {
  if (!activeSprintId || task.sprintId !== activeSprintId) {
    return {
      badge: "Backlog",
      detail: "This task is not in the active sprint yet.",
      actionLabel: "Add to sprint",
      inActiveSprint: false,
    };
  }

  const statusLabel =
    task.status === "in_progress" ? "In progress" : task.status === "done" ? "Done" : "To-do";

  return {
    badge: statusLabel,
    detail: "This task is currently assigned to the active sprint.",
    actionLabel: "Move to backlog",
    inActiveSprint: true,
  };
}

function statusBadgeLabel(status: TaskStatus) {
  if (status === "in_progress") {
    return "In progress";
  }

  if (status === "done") {
    return "Done";
  }

  return "To-do";
}

export function TaskDetailsDialog({
  activeSprintId,
  epicTitle,
  isMutating,
  onAddTaskToSprint,
  onClose,
  onDeleteTask,
  onMoveTask,
  onRemoveTaskFromSprint,
  onSaveTask,
  task,
}: TaskDetailsDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
  }, [task.id, task.title, task.description, task.status]);

  const lifecycle = lifecycleCopy(task, activeSprintId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveTask(task.id, {
      title,
      description,
      status,
    });
  }

  return (
    <div aria-hidden={false} className="dialog-backdrop" role="presentation">
      <section aria-modal="true" className="panel dialog-panel task-dialog" role="dialog">
        <div className="dialog-header">
          <div className="section-heading">
            <p className="eyebrow">Task Details</p>
            <h2>{title}</h2>
          </div>
          <button className="ghost-button" disabled={isMutating} onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="task-dialog-layout">
          <form className="task-dialog-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Task title</span>
              <input onChange={(event) => setTitle(event.target.value)} value={title} />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                className="task-dialog-textarea"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the outcome, constraints, and any implementation notes."
                value={description}
              />
            </label>

            <label className="field">
              <span>Status</span>
              <select onChange={(event) => setStatus(event.target.value as TaskStatus)} value={status}>
                <option value="todo">To-do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>

            <div className="dialog-actions">
              <button className="primary-button" disabled={isMutating} type="submit">
                Save task
              </button>
              <button className="ghost-button" disabled={isMutating} onClick={onClose} type="button">
                Done
              </button>
            </div>
          </form>

          <aside className="task-dialog-sidebar">
            <div className="task-detail-card">
              <p className="eyebrow">Context</p>
              <h3>{epicTitle}</h3>
              <p className="muted">{lifecycle.detail}</p>
              <div className="task-meta">
                <span className={`status-badge status-${status}`}>
                  {lifecycle.inActiveSprint ? statusBadgeLabel(status) : lifecycle.badge}
                </span>
                <span className="sprint-badge">Task {task.position + 1}</span>
              </div>
            </div>

            <div className="task-detail-card">
              <p className="eyebrow">Workflow</p>
              <div className="task-detail-actions">
                {activeSprintId ? (
                  lifecycle.inActiveSprint ? (
                    <button
                      className="secondary-button"
                      disabled={isMutating}
                      onClick={() => void onRemoveTaskFromSprint(task.id)}
                      type="button"
                    >
                      {lifecycle.actionLabel}
                    </button>
                  ) : (
                    <button
                      className="secondary-button"
                      disabled={isMutating}
                      onClick={() => void onAddTaskToSprint(task.id)}
                      type="button"
                    >
                      {lifecycle.actionLabel}
                    </button>
                  )
                ) : (
                  <p className="muted">Start a sprint to move this task onto the board.</p>
                )}

                <div className="inline-actions wrap-actions">
                  <button
                    className="ghost-button"
                    disabled={isMutating}
                    onClick={() => void onMoveTask(task.id, "up")}
                    type="button"
                  >
                    Move up
                  </button>
                  <button
                    className="ghost-button"
                    disabled={isMutating}
                    onClick={() => void onMoveTask(task.id, "down")}
                    type="button"
                  >
                    Move down
                  </button>
                </div>
              </div>
            </div>

            <div className="task-detail-card danger-card">
              <p className="eyebrow">Danger Zone</p>
              <p className="muted">Deleting a task removes it from the backlog and sprint history views.</p>
              <button
                className="ghost-button danger-button"
                disabled={isMutating}
                onClick={onDeleteTask}
                type="button"
              >
                Delete task
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
