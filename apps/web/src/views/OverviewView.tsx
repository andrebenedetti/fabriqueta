import type { Board, ActivityEntry } from "../types";
import type { TaskRecord, BacklogSort, TaskStatus } from "../utils";
import { taskStatusLabel, formatSprintDate } from "../utils";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/button";

type OverviewViewProps = {
  activityEntries: ActivityEntry[];
  board: Board | null;
  documentationCount: number;
  onOpenBacklog: () => void;
  onOpenTask: (taskId: string) => void;
  sprintRecords: TaskRecord[];
};

export function OverviewView({
  activityEntries,
  board,
  documentationCount,
  onOpenBacklog,
  onOpenTask,
  sprintRecords,
}: OverviewViewProps) {
  const totalTasks = board?.epics.reduce((count, epic) => count + epic.tasks.length, 0) ?? 0;
  const completedTasks = board?.epics.reduce(
    (count, epic) => count + epic.tasks.filter((task) => task.status === "done").length, 0,
  ) ?? 0;
  const sprintCompleted = sprintRecords.filter((record) => record.task.status === "done").length;
  const sprintProgress = sprintRecords.length ? Math.round((sprintCompleted / sprintRecords.length) * 100) : 0;

  return (
    <div className="overview-grid">
      <section className="panel-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sprint</p>
            <h2>{board?.activeSprint?.name ?? "No active sprint"}</h2>
          </div>
          {!board?.activeSprint ? (
            <Button onClick={onOpenBacklog} type="button">Open backlog</Button>
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
            <strong>{sprintProgress}%</strong>
          </div>
          <div className="progress-bar large">
            <div style={{ width: `${sprintProgress}%` }} />
          </div>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <p className="section-kicker">Backlog health</p>
          <h2>Current project state</h2>
        </div>
        <div className="metric-pairs">
          <div className="metric-row"><span>Epics</span><strong>{board?.epics.length ?? 0}</strong></div>
          <div className="metric-row"><span>Total tasks</span><strong>{totalTasks}</strong></div>
          <div className="metric-row"><span>Done tasks</span><strong>{completedTasks}</strong></div>
          <div className="metric-row"><span>Docs</span><strong>{documentationCount}</strong></div>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <p className="section-kicker">Active sprint scope</p>
          <h2>Tasks in motion</h2>
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
            <EmptyState title="No sprint tasks yet" message="Move tasks into a sprint from the planning view." />
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <p className="section-kicker">Sprint history</p>
          <h2>Recent completed sprints</h2>
        </div>
        <div className="history-list">
          {board?.sprintHistory.length ? (
            board.sprintHistory.slice(0, 4).map((sprint) => (
              <article className="history-card" key={sprint.id}>
                <div className="history-card-header">
                  <strong>{sprint.name}</strong>
                  <small>{formatSprintDate(sprint.completedAt)}</small>
                </div>
                <p>{sprint.completedTasks}/{sprint.totalTasks} tasks done</p>
                <p>{sprint.retrospectiveNotes || "No retrospective notes captured."}</p>
              </article>
            ))
          ) : (
            <EmptyState title="No sprint history yet" message="Complete a sprint to preserve its snapshot and retrospective notes." />
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading-row">
          <p className="section-kicker">Activity log</p>
          <h2>Recent project activity</h2>
        </div>
        <div className="history-list">
          {activityEntries.length ? (
            activityEntries.slice(0, 10).map((entry) => (
              <article className="history-card" key={entry.id}>
                <div className="history-card-header">
                  <strong>{entry.actor}</strong>
                  <small>{formatSprintDate(entry.createdAt)}</small>
                </div>
                <p>{entry.action} on {entry.entityType}</p>
                {entry.details ? <p>{entry.details}</p> : null}
              </article>
            ))
          ) : (
            <EmptyState title="No activity recorded yet" message="Agent and human actions will appear here as they occur." />
          )}
        </div>
      </section>
    </div>
  );
}
