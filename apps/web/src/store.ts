import { create } from "zustand";
import type { Board, Documentation, ActivityEntry, Epic, Task, TaskStatus, Sprint } from "./types";
import type { TaskRecord } from "./utils";

function buildTaskRecords(board: Board | null): TaskRecord[] {
  return (board?.epics ?? []).flatMap((epic) =>
    epic.tasks.map((task) => ({
      epic: { id: epic.id, title: epic.title, position: epic.position },
      task: { ...task },
    })),
  );
}

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<boolean | void>;
} | null;

export type ProjectView = "overview" | "backlog" | "planning" | "board" | "docs";

interface AppState {
  board: Board | null;
  documentation: Documentation | null;
  activityEntries: ActivityEntry[];
  isLoading: boolean;
  selectedTaskId: string | null;
  confirmDialog: ConfirmDialogState;
  activeView: ProjectView;
  toasts: Toast[];
  selectedTaskIds: string[];

  setBoard: (board: Board | null) => void;
  setDocumentation: (doc: Documentation | null) => void;
  setActivityEntries: (entries: ActivityEntry[]) => void;
  setIsLoading: (loading: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setConfirmDialog: (dialog: ConfirmDialogState) => void;
  setActiveView: (view: ProjectView) => void;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
  get taskRecords(): TaskRecord[];
  get activeSprintId(): string | null;
  get sprintRecords(): TaskRecord[];
}

export const useStore = create<AppState>((set, get) => ({
  board: null,
  documentation: null,
  activityEntries: [],
  isLoading: true,
  selectedTaskId: null,
  confirmDialog: null,
  activeView: "overview" as ProjectView,
  toasts: [],
  selectedTaskIds: [],

  setBoard: (board) => set({ board }),
  setDocumentation: (doc) => set({ documentation: doc }),
  setActivityEntries: (entries) => set({ activityEntries: entries }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedTaskIds: (ids: string[]) => set({ selectedTaskIds: ids }),
  setConfirmDialog: (dialog) => set({ confirmDialog: dialog }),
  setActiveView: (view) => set({ activeView: view }),

  addToast: (message, type) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  get taskRecords() {
    return buildTaskRecords(get().board);
  },

  get activeSprintId() {
    return get().board?.activeSprint?.id ?? null;
  },

  get sprintRecords() {
    const board = get().board;
    if (!board?.activeSprint) return [];
    return buildTaskRecords(board).filter((r) => r.task.sprintId === board.activeSprint!.id);
  },
}));
