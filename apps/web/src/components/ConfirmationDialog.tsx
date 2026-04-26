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
    <div aria-hidden={false} className="overlay-backdrop" role="presentation">
      <section aria-modal="true" className="confirmation-modal" role="dialog">
        <div className="detail-section-heading">
          <h3>{title}</h3>
        </div>
        <p className="section-subtitle">{message}</p>
        <div className="toolbar-actions">
          <button className="button button-secondary" disabled={isBusy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="button button-danger" disabled={isBusy} onClick={() => void onConfirm()} type="button">
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
