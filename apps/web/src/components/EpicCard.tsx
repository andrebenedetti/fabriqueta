import { FormEvent, useState } from "react";
import type { Epic, Task } from "../types";

type EpicCardProps = {
  activeSprintId: string | null;
  emptyMessage?: string;
  epic: Epic;
  isMutating: boolean;
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onCreateTask: (epicId: string, title: string) => Promise<void>;
  onDeleteEpic: (epicId: string) => Promise<void> | void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
  onMoveEpic: (epicId: string, direction: "up" | "down") => Promise<void>;
  onMoveTask: (taskId: string, direction: "up" | "down") => Promise<void>;
  onOpenTask: (taskId: string) => void;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
  onUpdateEpic: (epicId: string, input: { title: string; description?: string }) => Promise<void>;
};

function taskLifecycleLabel(task: Task, activeSprintId: string | null) {
  if (!activeSprintId || task.sprintId !== activeSprintId) {
    return "Backlog";
  }

  if (task.status === "in_progress") {
    return "In progress";
  }

  if (task.status === "done") {
    return "Done";
  }

  return "To-do";
}

export function EpicCard({
  activeSprintId,
  emptyMessage,
  epic,
  isMutating,
  onAddTaskToSprint,
  onCreateTask,
  onDeleteEpic,
  onDeleteTask,
  onMoveEpic,
  onMoveTask,
  onOpenTask,
  onRemoveTaskFromSprint,
  onUpdateEpic,
}: EpicCardProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [isEditingEpic, setIsEditingEpic] = useState(false);
  const [epicTitle, setEpicTitle] = useState(epic.title);
  const [epicDescription, setEpicDescription] = useState(epic.description);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) {
      return;
    }

    await onCreateTask(epic.id, taskTitle);
    setTaskTitle("");
  }

  async function handleSaveEpic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdateEpic(epic.id, {
      title: epicTitle,
      description: epicDescription,
    });
    setIsEditingEpic(false);
  }

  return (
    <section className="panel epic-card">
      <div className="epic-header">
        <div className="grow">
          <p className="eyebrow">Epic {epic.position + 1}</p>
          {isEditingEpic ? (
            <form className="stack gap-sm" onSubmit={handleSaveEpic}>
              <label className="field">
                <span>Epic title</span>
                <input onChange={(event) => setEpicTitle(event.target.value)} value={epicTitle} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  className="inline-textarea"
                  onChange={(event) => setEpicDescription(event.target.value)}
                  value={epicDescription}
                />
              </label>
              <div className="inline-actions">
                <button className="secondary-button" disabled={isMutating} type="submit">
                  Save epic
                </button>
                <button
                  className="ghost-button"
                  disabled={isMutating}
                  onClick={() => {
                    setIsEditingEpic(false);
                    setEpicTitle(epic.title);
                    setEpicDescription(epic.description);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h3>{epic.title}</h3>
              {epic.description ? <p className="muted">{epic.description}</p> : null}
            </>
          )}
        </div>

        <div className="inline-actions wrap-actions">
          <button disabled={isMutating} onClick={() => onMoveEpic(epic.id, "up")} type="button">
            Up
          </button>
          <button disabled={isMutating} onClick={() => onMoveEpic(epic.id, "down")} type="button">
            Down
          </button>
          {!isEditingEpic ? (
            <button disabled={isMutating} onClick={() => setIsEditingEpic(true)} type="button">
              Edit
            </button>
          ) : null}
          <button
            className="danger-inline-button"
            disabled={isMutating}
            onClick={() => onDeleteEpic(epic.id)}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>

      <form className="stack gap-sm" onSubmit={handleCreateTask}>
        <label className="field">
          <span>New task</span>
          <input
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder="Map user flows"
            value={taskTitle}
          />
        </label>

        <button className="secondary-button" disabled={isMutating} type="submit">
          Add task
        </button>
      </form>

      <ol className="task-list">
        {epic.tasks.length === 0 ? (
          <li className="task-empty">{emptyMessage ?? "No tasks yet for this epic."}</li>
        ) : (
          epic.tasks.map((task) => (
            <li className="task-row" key={task.id}>
              <div className="task-copy">
                <p>{task.title}</p>
                {task.description ? <small className="muted">{task.description}</small> : null}
                <div className="task-meta">
                  <small className="muted">Task {task.position + 1}</small>
                  <span className={`status-badge status-${task.status}`}>
                    {taskLifecycleLabel(task, activeSprintId)}
                  </span>
                </div>
              </div>

              <div className="inline-actions wrap-actions task-row-actions">
                {activeSprintId ? (
                  task.sprintId === activeSprintId ? (
                    <button
                      disabled={isMutating}
                      onClick={() => onRemoveTaskFromSprint(task.id)}
                      type="button"
                    >
                      Move to backlog
                    </button>
                  ) : (
                    <button disabled={isMutating} onClick={() => onAddTaskToSprint(task.id)} type="button">
                      Add to sprint
                    </button>
                  )
                ) : null}
                <button disabled={isMutating} onClick={() => onOpenTask(task.id)} type="button">
                  Open
                </button>
                <button disabled={isMutating} onClick={() => onMoveTask(task.id, "up")} type="button">
                  Up
                </button>
                <button disabled={isMutating} onClick={() => onMoveTask(task.id, "down")} type="button">
                  Down
                </button>
                <button
                  className="danger-inline-button"
                  disabled={isMutating}
                  onClick={() => onDeleteTask(task.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
