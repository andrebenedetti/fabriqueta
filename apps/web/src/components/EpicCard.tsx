import { FormEvent, useState } from "react";
import type { Epic } from "../types";

type EpicCardProps = {
  activeSprintId: string | null;
  epic: Epic;
  isMutating: boolean;
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onCreateTask: (epicId: string, title: string) => Promise<void>;
  onMoveEpic: (epicId: string, direction: "up" | "down") => Promise<void>;
  onMoveTask: (taskId: string, direction: "up" | "down") => Promise<void>;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
};

export function EpicCard({
  activeSprintId,
  epic,
  isMutating,
  onAddTaskToSprint,
  onCreateTask,
  onMoveEpic,
  onMoveTask,
  onRemoveTaskFromSprint,
}: EpicCardProps) {
  const [taskTitle, setTaskTitle] = useState("");

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) {
      return;
    }

    await onCreateTask(epic.id, taskTitle);
    setTaskTitle("");
  }

  return (
    <section className="panel epic-card">
      <div className="epic-header">
        <div>
          <p className="eyebrow">Epic {epic.position + 1}</p>
          <h3>{epic.title}</h3>
          {epic.description ? <p className="muted">{epic.description}</p> : null}
        </div>

        <div className="inline-actions">
          <button disabled={isMutating} onClick={() => onMoveEpic(epic.id, "up")} type="button">
            Up
          </button>
          <button disabled={isMutating} onClick={() => onMoveEpic(epic.id, "down")} type="button">
            Down
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
          <li className="task-empty">No tasks yet for this epic.</li>
        ) : (
          epic.tasks.map((task) => (
            <li className="task-row" key={task.id}>
              <div className="task-copy">
                <p>{task.title}</p>
                <div className="task-meta">
                  <small className="muted">Task {task.position + 1}</small>
                  {activeSprintId && task.sprintId === activeSprintId ? (
                    <span className="sprint-badge">In sprint</span>
                  ) : null}
                </div>
              </div>

              <div className="inline-actions">
                {activeSprintId ? (
                  task.sprintId === activeSprintId ? (
                    <button
                      disabled={isMutating}
                      onClick={() => onRemoveTaskFromSprint(task.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      disabled={isMutating}
                      onClick={() => onAddTaskToSprint(task.id)}
                      type="button"
                    >
                      Add to sprint
                    </button>
                  )
                ) : null}
                <button
                  disabled={isMutating}
                  onClick={() => onMoveTask(task.id, "up")}
                  type="button"
                >
                  Up
                </button>
                <button
                  disabled={isMutating}
                  onClick={() => onMoveTask(task.id, "down")}
                  type="button"
                >
                  Down
                </button>
              </div>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
