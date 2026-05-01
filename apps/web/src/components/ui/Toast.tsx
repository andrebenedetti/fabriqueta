import { Icon } from "../icons";
import { useStore } from "../../store";
import { Button } from "./button";

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <Button className="compact-button" onClick={() => removeToast(toast.id)} type="button" variant="ghost">
            <Icon name="chevron-right" />
          </Button>
        </div>
      ))}
    </div>
  );
}
