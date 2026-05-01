import { useState, useMemo, type FormEvent } from "react";
import type { Board, Sprint } from "../types";
import type { TaskRecord } from "../utils";
import { taskStatusLabel } from "../utils";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type PlanningViewProps = {
  activeSprint: Sprint | null;
  backlogRecords: TaskRecord[];
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onOpenTask: (taskId: string) => void;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
  onStartSprint: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  sprintName: string;
  onSprintNameChange: (value: string) => void;
};

export function PlanningView({
  activeSprint,
  backlogRecords,
  onAddTaskToSprint,
  onOpenTask,
  onRemoveTaskFromSprint,
  onStartSprint,
  sprintName,
  onSprintNameChange,
}: PlanningViewProps) {
  const [sprintCapacity, setSprintCapacity] = useState(10);
  const [showCompleted, setShowCompleted] = useState(false);

  const availableBacklog = useMemo(
    () => backlogRecords.filter((r) => showCompleted || r.task.status !== "done"),
    [backlogRecords, showCompleted],
  );

  const sprintTaskList = useMemo(
    () => backlogRecords.filter((r) => r.task.sprintId === activeSprint?.id),
    [backlogRecords, activeSprint?.id],
  );

  const visibleBacklog = useMemo(
    () => availableBacklog.filter((r) => r.task.sprintId !== activeSprint?.id),
    [availableBacklog, activeSprint?.id],
  );

  return (
    <div className="planning-grid">
      {activeSprint ? (
        <>
          <section className="panel-section">
            <div className="section-heading-row">
              <p className="section-kicker">Sprint scope</p>
              <h2>{activeSprint.name}</h2>
            </div>
            <div className="capacity-bar-wrapper">
              <div className="progress-row">
                <span>Capacity</span>
                <strong>{sprintTaskList.length} / {sprintCapacity} tasks</strong>
              </div>
              <div className="progress-bar large">
                <div
                  className={sprintTaskList.length > sprintCapacity ? "over-capacity" : ""}
                  style={{ width: `${Math.min((sprintTaskList.length / sprintCapacity) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="list-stack">
              {sprintTaskList.length ? (
                sprintTaskList.map((record) => (
                  <div className="list-row" key={record.task.id}>
                    <button className="list-row-button grow-button" onClick={() => onOpenTask(record.task.id)} type="button">
                      <div>
                        <strong>{record.task.title}</strong>
                        <small>{record.epic.title}</small>
                      </div>
                      <span className={`status-pill status-${record.task.status}`}>{taskStatusLabel(record.task.status)}</span>
                    </button>
                    <Button onClick={() => void onRemoveTaskFromSprint(record.task.id)} type="button" variant="secondary">Remove</Button>
                  </div>
                ))
              ) : (
                <p className="empty-inline-copy">Drag or add tasks from the backlog panel on the right.</p>
              )}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-heading-row">
              <p className="section-kicker">Available backlog</p>
              <h2>Ready to pull in</h2>
            </div>
            <label className="checkbox-field">
              <input checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} type="checkbox" />
              <span>Show completed tasks</span>
            </label>
            <div className="list-stack">
              {visibleBacklog.length ? (
                visibleBacklog.map((record) => (
                  <div className="list-row" key={record.task.id}>
                    <button className="list-row-button grow-button" onClick={() => onOpenTask(record.task.id)} type="button">
                      <div>
                        <strong>{record.task.title}</strong>
                        <small>{record.epic.title}</small>
                      </div>
                      <span className={`status-pill status-${record.task.status}`}>{taskStatusLabel(record.task.status)}</span>
                    </button>
                    <Button onClick={() => void onAddTaskToSprint(record.task.id)} type="button">Add</Button>
                  </div>
                ))
              ) : (
                <EmptyState title="No backlog tasks available" message="Everything is already in the sprint or the project has no tasks yet." />
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="panel-section">
          <div className="section-heading-row">
            <p className="section-kicker">Sprint setup</p>
            <h2>Start the next sprint</h2>
          </div>
          <p className="section-subtitle">Create a sprint to begin planning which tasks to work on.</p>
          <form className="stack-form" onSubmit={onStartSprint}>
            <label className="field">
              <span>Sprint name</span>
              <Input onChange={(e) => onSprintNameChange(e.target.value)} placeholder="UI Redesign Sprint" value={sprintName} />
            </label>
            <label className="field">
              <span>Sprint capacity</span>
              <Input onChange={(e) => setSprintCapacity(Number(e.target.value) || 10)} placeholder="10" type="number" value={sprintCapacity} />
            </label>
            <Button type="submit">Start sprint</Button>
          </form>
        </section>
      )}
    </div>
  );
}
