import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
    <Dialog onOpenChange={(open) => { if (!open) onCancel(); }} open>
      <DialogContent className="confirmation-modal" showCloseButton={false}>
        <DialogHeader className="detail-section-heading">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="section-subtitle">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="toolbar-actions">
          <Button disabled={isBusy} onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isBusy} onClick={() => void onConfirm()} type="button" variant="destructive">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
