import { useState, useEffect, useCallback } from "react";
import { useStore } from "../store";
import { Icon } from "./icons";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function SnapshotManagement({ projectSlug }: { projectSlug: string }) {
  const snapshots = useStore((s) => s.snapshots);
  const fetchSnapshots = useStore((s) => s.fetchSnapshots);
  const createSnapshot = useStore((s) => s.createSnapshot);
  const restoreSnapshot = useStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useStore((s) => s.deleteSnapshot);
  const addToast = useStore((s) => s.addToast);
  const setConfirmDialog = useStore((s) => s.setConfirmDialog);

  const [label, setLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    fetchSnapshots(projectSlug).catch(() => {
      addToast("Failed to load snapshots", "error");
    });
  }, [projectSlug]);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      await createSnapshot(projectSlug, label.trim() || undefined);
      setLabel("");
      addToast("Snapshot created", "success");
    } catch {
      addToast("Failed to create snapshot", "error");
    } finally {
      setIsCreating(false);
    }
  }, [projectSlug, label]);

  const handleRestore = useCallback(
    (snapshotId: string, snapshotLabel: string | null) => {
      setConfirmDialog({
        title: "Restore Snapshot",
        message: `Are you sure you want to restore snapshot "${snapshotLabel ?? snapshotId}"?\n\nThis will replace all current project data and cannot be undone.`,
        confirmLabel: "Restore Snapshot",
        onConfirm: async () => {
          setRestoringId(snapshotId);
          try {
            await restoreSnapshot(projectSlug, snapshotId);
            addToast("Snapshot restored successfully", "success");
          } catch {
            addToast("Failed to restore snapshot", "error");
          } finally {
            setRestoringId(null);
          }
          return true;
        },
      });
    },
    [projectSlug],
  );

  const handleDelete = useCallback(
    (snapshotId: string, snapshotLabel: string | null) => {
      setConfirmDialog({
        title: "Delete Snapshot",
        message: `Are you sure you want to delete snapshot "${snapshotLabel ?? snapshotId}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        onConfirm: async () => {
          try {
            await deleteSnapshot(projectSlug, snapshotId);
            addToast("Snapshot deleted", "success");
          } catch {
            addToast("Failed to delete snapshot", "error");
          }
          return true;
        },
      });
    },
    [projectSlug],
  );

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Snapshots
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Capture and restore project state (database + documentation) at any point in
          time.
        </p>
      </div>

      {/* Create Snapshot */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label
            htmlFor="snapshot-label"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Label (optional)
          </label>
          <Input
            id="snapshot-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. before-refactor"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button
          type="button"
          disabled={isCreating}
          onClick={handleCreate}
        >
          <Icon name="plus" className="h-4 w-4" />
          {isCreating ? "Creating..." : "Create Snapshot"}
        </Button>
      </div>

      {/* Snapshot List */}
      {snapshots.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <Icon
            name="backup"
            className="mx-auto h-10 w-10 text-gray-400"
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No snapshots yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <TableHeader className="bg-gray-50 dark:bg-gray-900">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Label
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Created
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  DB Size
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Docs
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
              {snapshots.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <div className="font-medium">{s.label ?? "(no label)"}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {s.id}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(s.createdAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {formatBytes(s.dbSizeBytes)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {s.docCount} nodes ({formatBytes(s.docSizeBytes)})
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        disabled={restoringId === s.id}
                        onClick={() => handleRestore(s.id, s.label)}
                        size="sm"
                        variant="secondary"
                      >
                        <Icon name="refresh" className="h-3.5 w-3.5" />
                        {restoringId === s.id ? "Restoring..." : "Restore"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDelete(s.id, s.label)}
                        size="sm"
                        variant="destructive"
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
