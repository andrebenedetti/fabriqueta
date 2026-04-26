type ConfirmationDialogProps = {
  confirmLabel: string;
  isBusy: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
};

export function ConfirmationDialog({
  confirmLabel,
  isBusy,
  message,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  return (
    <div aria-hidden={false} className="dialog-backdrop" role="presentation">
      <section aria-modal="true" className="panel dialog-panel confirmation-dialog" role="dialog">
        <div className="dialog-header">
          <div className="section-heading">
            <p className="eyebrow">Please confirm</p>
            <h2>{title}</h2>
          </div>
          <button className="ghost-button" disabled={isBusy} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>

        <p className="lead">{message}</p>

        <div className="dialog-actions">
          <button className="ghost-button" disabled={isBusy} onClick={onCancel} type="button">
            Keep it
          </button>
          <button
            className="primary-button danger-solid-button"
            disabled={isBusy}
            onClick={() => void onConfirm()}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
