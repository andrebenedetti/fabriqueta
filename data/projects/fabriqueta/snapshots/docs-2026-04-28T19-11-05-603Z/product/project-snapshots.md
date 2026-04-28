# Project Snapshots & Rollback

Fabriqueta supports project state snapshots — point-in-time backups of the entire project including the SQLite database, documentation files, and metadata. Snapshots enable safe experimentation, autonomous delivery rollbacks, and project state preservation.

## Snapshot Contents

Each snapshot captures:
- **SQLite database** — all epics, tasks, sprints, documentation nodes, activity log
- **Documentation files** — exported as markdown files preserving the directory structure
- **Metadata JSON** — label, timestamp, file sizes, table row counts

Snapshot ID format: ISO timestamp with colons replaced by hyphens (e.g., `2026-04-28T12-00-00-000Z`)

## Creating Snapshots

### Via UI
1. Navigate to `/projects/{slug}/snapshots`
2. Click "Create Snapshot"
3. Optionally enter a label (e.g., "before-refactor", "pre-release-v1.2")
4. Click "Create"

### Via MCP Tool
```
call_tool("create_snapshot", {
  projectSlug: "my-project",
  label: "optional-label"
})
```

### Via CLI
```bash
bun run snapshot create my-project
bun run snapshot create my-project --label "before-experiment"
```

### Auto-Snapshots
The `autonomous-delivery` skill automatically creates snapshots before starting work:
- Label format: `auto-2026-04-28T12-00-00-000Z`
- Protects project state in case rollback is needed
- Snapshot ID is logged in the first task comment

## Listing Snapshots

### Via UI
Navigate to `/projects/{slug}/snapshots` to see all snapshots with:
- Label and timestamp
- Database size and documentation size
- Row counts for each table
- Creation date

### Via MCP Tool
```
call_tool("list_snapshots", {
  projectSlug: "my-project"
})
```

Returns an array of snapshot metadata objects.

### Via CLI
```bash
bun run snapshot list my-project
```

## Restoring Snapshots

**Warning:** Restore is irreversible. The current project state will be replaced by the snapshot state.

### Via UI
1. Navigate to `/projects/{slug}/snapshots`
2. Find the snapshot to restore
3. Click "Restore"
4. Check the confirmation checkbox: "I understand this will replace the current project state"
5. Click "Confirm Restore"

### Via MCP Tool
```
call_tool("restore_snapshot", {
  projectSlug: "my-project",
  snapshotId: "2026-04-28T12-00-00-000Z"
})
```

### Via CLI
```bash
bun run snapshot restore my-project 2026-04-28T12-00-00-000Z
```

### What Happens During Restore
1. The snapshot SQLite file replaces the current project database
2. Documentation is re-imported from the snapshot's documentation directory
3. The activity log records the restore event

## Deleting Snapshots

### Via UI
Click "Delete" next to the snapshot (requires confirmation).

### Via MCP Tool
```
call_tool("delete_snapshot", {
  projectSlug: "my-project",
  snapshotId: "2026-04-28T12-00-00-000Z"
})
```

### Via CLI
```bash
bun run snapshot delete my-project 2026-04-28T12-00-00-000Z
```

## Integration with Autonomous Delivery

The `autonomous-delivery` skill creates auto-snapshots before starting work:

```markdown
5. Create a project snapshot before starting execution:
   - Call the `create_snapshot` MCP tool with label `auto-<timestamp>`
   - This protects the project state in case the autonomous run needs to be rolled back
   - Log the snapshot ID in your first task comment so it can be found later
```

For risky work (major refactors, experimental features), the `agent-execution` skill recommends manual snapshots:

```markdown
## Snapshot Before Risky Work

Before starting risky work, create a snapshot:
- Call `create_snapshot` with a label like `pre-refactor-{feature}`
- This gives you a rollback point if the work introduces issues
- Log the snapshot ID in the task description or a comment
```

## Snapshot Storage

Snapshots are stored in:
```
data/projects/{slug}/snapshots/
  {snapshot-id}.sqlite           # Database backup
  {snapshot-id}.metadata.json   # Metadata
  docs-{snapshot-id}/             # Documentation directory
    specs/
      readme.md
    architecture/
      system.md
```

## Best Practices

1. **Label snapshots meaningfully** — Use labels like "pre-release-v2.0", "before-payment-refactor"
2. **Auto-snapshots for autonomous work** — The `autonomous-delivery` skill handles this automatically
3. **Manual snapshots before risky changes** — Create snapshots before major refactors or experimental features
4. **Clean up old snapshots** — Delete snapshots that are no longer needed to save disk space
5. **Verify snapshots periodically** — Use `list_snapshots` to ensure snapshots are being created correctly

## Troubleshooting

### Restore Fails with "Snapshot not found"
- Verify the snapshot ID exists: `bun run snapshot list {slug}`
- Check that both `.sqlite` and `.metadata.json` files exist in the snapshots directory

### Restore Fails with Corrupted Data
- The snapshot database file may be corrupted
- Check the file size — a valid snapshot should match the metadata's `dbSizeBytes`
- Delete the corrupted snapshot and use an older one

### Documentation Not Restored
- Verify the `docs-{snapshot-id}` directory exists and contains files
- Check that the documentation was exported correctly in the snapshot metadata (`docCount` > 0)
