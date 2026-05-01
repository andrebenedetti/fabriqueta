import { FormEvent, useEffect, useState } from "react";
import type { Task, TaskStatus } from "../types";
import { formatShortDate, taskStatusLabel } from "../utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Textarea } from "./ui/textarea";

type TaskDetailsDialogProps = {
  activeSprintId: string | null;
  epicTitle: string;
  isMutating: boolean;
  onAddTaskToSprint: (taskId: string) => Promise<void>;
  onClose: () => void;
  onDeleteTask: () => void;
  onRemoveTaskFromSprint: (taskId: string) => Promise<void>;
  onSaveTask: (taskId: string, input: { title: string; description?: string; status?: TaskStatus }) => Promise<void>;
  task: Task;
};

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
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([]);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
  }, [task.id, task.title, task.description, task.status]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const lifecycle = (() => {
    if (!activeSprintId || task.sprintId !== activeSprintId) {
      return { badge: "Backlog", detail: "Not in the active sprint.", actionLabel: "Add to sprint", inActiveSprint: false };
    }
    return { badge: "Active sprint", detail: "Assigned to the active sprint.", actionLabel: "Move to backlog", inActiveSprint: true };
  })();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveTask(task.id, { title, description, status });
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    setComments((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, author: "session-agent", text: commentText.trim(), time: new Date().toISOString() },
    ]);
    setCommentText("");
  }

  return (
    <Sheet onOpenChange={(open) => { if (!open) onClose(); }} open>
      <SheetContent className="task-drawer task-drawer-enhanced p-0" showCloseButton={false}>
        <SheetHeader className="drawer-header">
          <div>
            <p className="section-kicker">Task</p>
            <SheetTitle id="task-drawer-title">{task.title}</SheetTitle>
            <SheetDescription className="section-subtitle">{epicTitle}</SheetDescription>
          </div>
          <Button className="compact-button" onClick={onClose} type="button" variant="ghost">Close</Button>
        </SheetHeader>

        <div className="drawer-layout">
          <form className="drawer-main" onSubmit={handleSubmit}>
            <section className="detail-section">
              <div className="detail-section-heading">
                <h3>Overview</h3>
                <span className="detail-chip">{lifecycle.badge}</span>
              </div>

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
            </section>

            <section className="detail-section">
              <div className="detail-section-heading">
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
                {comments.length === 0 ? (
                  <p className="empty-inline-copy">No comments yet.</p>
                ) : null}
              </div>
              <div className="inline-input-row comment-input">
                <Input
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); } }}
                  placeholder="Add a comment..."
                  value={commentText}
                />
                <Button disabled={!commentText.trim()} onClick={handleAddComment} type="button">Send</Button>
              </div>
            </section>

            <section className="detail-section">
              <div className="detail-section-heading">
                <h3>Activity</h3>
              </div>
              <div className="activity-stream">
                <p className="activity-item"><strong>Created</strong> {formatShortDate(task.createdAt)}</p>
                <p className="activity-item"><strong>Status</strong> {taskStatusLabel(task.status)}</p>
                {task.claimedBy ? (
                  <p className="activity-item"><strong>Claimed by</strong> {task.claimedBy}</p>
                ) : null}
              </div>
            </section>

            <div className="drawer-footer">
              <div className="drawer-footer-meta">
                <span>Task {task.position + 1} in {epicTitle}</span>
              </div>
              <div className="toolbar-actions">
                <Button onClick={onClose} type="button" variant="secondary">Cancel</Button>
                <Button disabled={isMutating} type="submit">Save task</Button>
              </div>
            </div>
          </form>

          <aside className="drawer-sidebar">
            <section className="detail-section">
              <div className="detail-section-heading"><h3>Context</h3></div>
              <div className="signal-stack">
                <div className={`signal-pill status-${task.status}`}>Status: {taskStatusLabel(task.status)}</div>
                <div className="signal-pill">Epic: {epicTitle}</div>
                <div className="signal-pill">Task {task.position + 1}</div>
                <div className="signal-pill">Created: {formatShortDate(task.createdAt)}</div>
                <div className="signal-pill">Updated: {formatShortDate(task.createdAt)}</div>
                {task.claimedBy ? (
                  <div className="signal-pill claimed-pill">Claimed by {task.claimedBy}</div>
                ) : null}
              </div>
            </section>

            <section className="detail-section">
              <div className="detail-section-heading"><h3>Sprint</h3></div>
              {activeSprintId ? (
                lifecycle.inActiveSprint ? (
                  <Button className="button-block" disabled={isMutating} onClick={() => void onRemoveTaskFromSprint(task.id)} type="button" variant="secondary">Move to backlog</Button>
                ) : (
                  <Button className="button-block" disabled={isMutating} onClick={() => void onAddTaskToSprint(task.id)} type="button" variant="secondary">Add to sprint</Button>
                )
              ) : (
                <p className="empty-inline-copy">Start a sprint to move this task onto the board.</p>
              )}
            </section>

            <section className="detail-section detail-danger">
              <div className="detail-section-heading"><h3>Danger zone</h3></div>
              <p className="empty-inline-copy">Deleting this task removes it from the backlog and sprint workspace.</p>
              <Button className="button-block" onClick={onDeleteTask} type="button" variant="destructive">Delete task</Button>
            </section>
          </aside>
        </div>
      </SheetContent>
    </Sheet>
  );
}
