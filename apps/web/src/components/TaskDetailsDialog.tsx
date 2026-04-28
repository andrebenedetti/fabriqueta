import { FormEvent, useEffect, useState } from "react";
import type { Task, TaskStatus } from "../types";

type TaskDetailsDialogProps = {
  activeSprintId: string | null;
  epicTitle: string;
  isMutating: boolean;
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onClose: () => void;
  onDeleteTask: () => void;
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

  return {
    badge: "Active sprint",
    detail: "This task is currently assigned to the active sprint.",
    actionLabel: "Move to backlog",
    inActiveSprint: true,
  };
}

function statusLabel(status: TaskStatus) {
  if (status === "in_progress") {
    return "In progress";
  }

  if (status === "done") {
    return "Done";
  }

  return "To do";
}

export function TaskDetailsDialog({
  activeSprintId,
  epicTitle,
  isMutating,
  onAddTaskToSprint,
  onClose,
  onDeleteTask,
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
    <div aria-hidden={false} className="overlay-backdrop overlay-right" role="presentation">
      <section aria-labelledby="task-drawer-title" aria-modal="true" className="task-drawer" role="dialog">
        <div className="drawer-header">
          <div>
            <p className="section-kicker">Task</p>
            <h2 id="task-drawer-title">{task.title}</h2>
            <p className="section-subtitle">{epicTitle}</p>
          </div>
          <button className="ghost-button compact-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="drawer-layout">
          <form className="drawer-main" onSubmit={handleSubmit}>
            <section className="detail-section">
              <div className="detail-section-heading">
                <h3>Overview</h3>
                <span className="detail-chip">{lifecycle.badge}</span>
              </div>

              <label className="field">
                <span>Title</span>
                <input onChange={(event) => setTitle(event.target.value)} value={title} />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  className="drawer-textarea"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the outcome, constraints, or implementation notes."
                  value={description}
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select onChange={(event) => setStatus(event.target.value as TaskStatus)} value={status}>
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </label>
            </section>

            <div className="drawer-footer">
              <div className="drawer-footer-meta">
                <span>{lifecycle.detail}</span>
                <span>Task {task.position + 1} in {epicTitle}</span>
              </div>
              <div className="toolbar-actions">
                <button className="button button-secondary" onClick={onClose} type="button">
                  Cancel
                </button>
                <button className="button button-primary" disabled={isMutating} type="submit">
                  Save task
                </button>
              </div>
            </div>
          </form>

          <aside className="drawer-sidebar">
            <section className="detail-section">
              <div className="detail-section-heading">
                <h3>Context</h3>
              </div>
              <div className="signal-stack">
                <div className={`signal-pill status-${task.status}`}>Status: {statusLabel(task.status)}</div>
                <div className="signal-pill">Epic: {epicTitle}</div>
                <div className="signal-pill">Task {task.position + 1}</div>
                {task.claimedBy ? (
                  <div className="signal-pill claimed-pill">Claimed by {task.claimedBy}</div>
                ) : null}
              </div>
            </section>

            <section className="detail-section">
              <div className="detail-section-heading">
                <h3>Sprint</h3>
              </div>
              {activeSprintId ? (
                lifecycle.inActiveSprint ? (
                  <button
                    className="button button-secondary button-block"
                    disabled={isMutating}
                    onClick={() => void onRemoveTaskFromSprint(task.id)}
                    type="button"
                  >
                    Move to backlog
                  </button>
                ) : (
                  <button
                    className="button button-secondary button-block"
                    disabled={isMutating}
                    onClick={() => void onAddTaskToSprint(task.id)}
                    type="button"
                  >
                    Add to sprint
                  </button>
                )
              ) : (
                <p className="empty-inline-copy">Start a sprint to move this task onto the board.</p>
              )}
            </section>

            <section className="detail-section detail-danger">
              <div className="detail-section-heading">
                <h3>Danger zone</h3>
              </div>
              <p className="empty-inline-copy">Deleting this task removes it from the backlog and sprint workspace.</p>
              <button className="button button-danger button-block" onClick={onDeleteTask} type="button">
                Delete task
              </button>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
