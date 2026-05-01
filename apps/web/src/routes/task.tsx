import { useEffect, useState } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { fetchBoard, updateTask, addTaskToSprint, removeTaskFromSprint, deleteTask } from "../api";
import { AppShell, type ShellNavSection } from "../components/AppShell";
import { Icon } from "../components/icons";
import { ToastContainer } from "../components/ui/Toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useStore } from "../store";
import { taskStatusLabel, formatShortDate } from "../utils";
import type { Task, TaskStatus } from "../types";
import { Route as RootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/projects/$projectSlug/tasks/$taskId",
  component: TaskDetailPage,
});

export function TaskDetailPage() {
  const { projectSlug, taskId } = Route.useParams();
  const navigate = useNavigate();
  const board = useStore((s) => s.board);
  const setBoard = useStore((s) => s.setBoard);
  const addToast = useStore((s) => s.addToast);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [isSaving, setIsSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([]);

  const task = (board?.epics ?? [])
    .flatMap((epic) => epic.tasks.map((t) => ({ ...t, epicTitle: epic.title })))
    .find((t) => t.id === taskId);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
    }
  }, [task?.id, task?.title, task?.description, task?.status]);

  useEffect(() => {
    if (!board) {
      fetchBoard(projectSlug).then(setBoard).catch(() => {});
    }
  }, [projectSlug]);

  async function handleSave() {
    if (!task) return;
    setIsSaving(true);
    try {
      await updateTask(projectSlug, task.id, { title, description, status });
      addToast("Task updated", "success");
      await fetchBoard(projectSlug).then(setBoard);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update task", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await deleteTask(projectSlug, task.id);
      addToast("Task deleted", "success");
      await navigate({ to: "/projects/$projectSlug", params: { projectSlug }, search: { view: "backlog" } });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete task", "error");
    }
  }

  const activeSprintId = board?.activeSprint?.id ?? null;

  if (!task) {
    return (
      <AppShell
        commandLabel="Search tasks and docs"
        navSections={[]}
        onCommandClick={() => {}}
        pageHeader={<div className="page-header"><h1>Task not found</h1></div>}
      >
        <div className="empty-placeholder">
          <h3>Task not found</h3>
          <p>The task you are looking for does not exist or has been deleted.</p>
        </div>
        <ToastContainer />
      </AppShell>
    );
  }

  const navSections: ShellNavSection[] = [
    {
      label: "Navigation",
      items: [
        {
          id: "back",
          label: "Back to project",
          icon: "home" as const,
          onClick: () => void navigate({ to: "/projects/$projectSlug", params: { projectSlug }, search: { view: "backlog" } }),
        },
      ],
    },
  ];

  return (
    <>
      <AppShell
        commandLabel="Search tasks and docs"
        navSections={navSections}
        onCommandClick={() => {}}
        pageHeader={
          <div className="page-header">
            <div>
              <p className="section-kicker">Task detail</p>
              <h1>{task.title}</h1>
            </div>
          </div>
        }
        topbarMeta={<div className="workspace-badge"><span>{projectSlug}</span></div>}
      >
        <div className="task-detail-page">
          <div className="task-detail-main">
            <section className="panel-section">
              <label className="field">
                <span>Title</span>
                <Input onChange={(e) => setTitle(e.target.value)} value={title} />
              </label>
              <label className="field">
                <span>Description</span>
                <Textarea
                  className="drawer-textarea"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the outcome, constraints, or implementation notes."
                  value={description}
                  rows={8}
                />
              </label>
              <label className="field">
                <span>Status</span>
                <Select onValueChange={(value) => setStatus(value as TaskStatus)} value={status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To do</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <div className="toolbar-actions">
                <Button onClick={() => window.history.back()} type="button" variant="secondary">Back</Button>
                <Button disabled={isSaving} onClick={handleSave} type="button">
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-heading-row">
                <h3>Comments</h3>
              </div>
              <div className="comment-list">
                {comments.map((c) => (
                  <div className="comment-item" key={c.id}>
                    <div className="comment-header">
                      <strong>{c.author}</strong>
                      <small>{formatShortDate(c.time)}</small>
                    </div>
                    <p>{c.text}</p>
                  </div>
                ))}
                {comments.length === 0 ? <p className="empty-inline-copy">No comments yet.</p> : null}
              </div>
              <div className="inline-input-row comment-input">
                <Input
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setComments((prev) => [...prev, { id: `c-${Date.now()}`, author: "session-agent", text: commentText.trim(), time: new Date().toISOString() }]); setCommentText(""); } }}
                  placeholder="Add a comment..."
                  value={commentText}
                />
                <Button
                  disabled={!commentText.trim()}
                  onClick={() => { setComments((prev) => [...prev, { id: `c-${Date.now()}`, author: "session-agent", text: commentText.trim(), time: new Date().toISOString() }]); setCommentText(""); }}
                  type="button"
                >
                  Send
                </Button>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-heading-row">
                <h3>Activity</h3>
              </div>
              <div className="activity-stream">
                <p className="activity-item"><strong>Created</strong> {formatShortDate(task.createdAt)}</p>
                <p className="activity-item"><strong>Status</strong> {taskStatusLabel(task.status)}</p>
                {task.claimedBy ? <p className="activity-item"><strong>Claimed by</strong> {task.claimedBy}</p> : null}
              </div>
            </section>
          </div>

          <aside className="task-detail-sidebar">
            <section className="panel-section">
              <div className="detail-section-heading"><h3>Context</h3></div>
              <div className="signal-stack">
                <div className={`signal-pill status-${task.status}`}>Status: {taskStatusLabel(task.status)}</div>
                <div className="signal-pill">Epic: {task.epicTitle}</div>
                <div className="signal-pill">Task {task.position + 1}</div>
                <div className="signal-pill">Created: {formatShortDate(task.createdAt)}</div>
                {task.claimedBy ? <div className="signal-pill claimed-pill">Claimed by {task.claimedBy}</div> : null}
              </div>
            </section>

            <section className="panel-section">
              <div className="detail-section-heading"><h3>Sprint</h3></div>
              {activeSprintId ? (
                task.sprintId === activeSprintId ? (
                  <Button className="button-block" onClick={() => { void removeTaskFromSprint(projectSlug, task.id).then(() => fetchBoard(projectSlug).then(setBoard)); }} type="button" variant="secondary">
                    Move to backlog
                  </Button>
                ) : (
                  <Button className="button-block" onClick={() => { void addTaskToSprint(projectSlug, task.id).then(() => fetchBoard(projectSlug).then(setBoard)); }} type="button">
                    Add to sprint
                  </Button>
                )
              ) : (
                <p className="empty-inline-copy">Start a sprint from the planning view.</p>
              )}
            </section>

            <section className="panel-section">
              <div className="detail-section-heading"><h3>Danger zone</h3></div>
              <p className="empty-inline-copy">Deleting this task removes it permanently.</p>
              <Button className="button-block" onClick={handleDelete} type="button" variant="destructive">Delete task</Button>
            </section>
          </aside>
        </div>
      </AppShell>
      <ToastContainer />
    </>
  );
}
