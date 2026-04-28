import { Icon } from "../icons";
import { useStore } from "../../store";

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button className="ghost-button compact-button" onClick={() => removeToast(toast.id)} type="button">
            <Icon name="chevron-right" />
          </button>
        </div>
      ))}
    </div>
  );
}
