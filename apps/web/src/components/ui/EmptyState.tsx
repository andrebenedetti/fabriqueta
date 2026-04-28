import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-placeholder">
      <h3>{title}</h3>
      <p>{message}</p>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
