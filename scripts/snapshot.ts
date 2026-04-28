import {
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
  deleteSnapshot,
  type SnapshotMetadata,
} from "../apps/server/src/db";

function listProjects(): string[] {
  const projectsDir =
    process.env.FABRIQUETA_PROJECTS_DIR ??
    new URL("../data/projects", import.meta.url).pathname;

  if (!Bun.file(projectsDir!).exists()) return [];

  return (
    Bun.file(projectsDir!)
      .arrayBuffer()
      .then(() => {
        const files = Array.fromSync(projectsDir!);
        return files
          .filter((f) => f.endsWith(".sqlite"))
          .map((f) => f.slice(0, -".sqlite".length))
          .sort();
      })
  ).then((files) => files ?? []);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const projectSlug = args[1];
  const extraArg = args[2];

  if (!projectSlug && command !== "list") {
    const projects = await listProjects();
    if (projects.length === 0) {
      console.error("No projects found.");
      process.exit(1);
    }
    console.error(
      `Usage: bun run scripts/snapshot.ts <create|list|restore|delete> <projectSlug> [extra]`,
    );
    console.error(`Available projects: ${projects.join(", ")}`);
    process.exit(1);
  }

  if (command === "create") {
    const label = extraArg;
    console.log(`Creating snapshot for "${projectSlug}"...`);
    const snapshot = createSnapshot(projectSlug!, { label });
    console.log(`Snapshot created: ${snapshot.id}`);
    console.log(`  Label: ${snapshot.label ?? "(none)"}`);
    console.log(`  DB size: ${snapshot.dbSizeBytes} bytes`);
    console.log(
      `  Docs: ${snapshot.docCount} nodes, ${snapshot.docSizeBytes} bytes`,
    );
    return;
  }

  if (command === "list") {
    const slug = projectSlug!;
    console.log(`Listing snapshots for "${slug}"...`);
    const snapshots = listSnapshots(slug);
    if (snapshots.length === 0) {
      console.log("  No snapshots found.");
      return;
    }
    for (const s of snapshots) {
      console.log(`  ${s.id}`);
      console.log(`    Label: ${s.label ?? "(none)"}`);
      console.log(`    Created: ${s.createdAt}`);
      console.log(`    DB: ${s.dbSizeBytes} bytes`);
      console.log(
        `    Docs: ${s.docCount} nodes, ${s.docSizeBytes} bytes`,
      );
      console.log(
        `    Rows: epics=${s.tableRowCounts.epics}, tasks=${s.tableRowCounts.tasks}, sprints=${s.tableRowCounts.sprints}, docs=${s.tableRowCounts.documentation_nodes}, activity=${s.tableRowCounts.activity_log}`,
      );
    }
    return;
  }

  const snapshotId = extraArg;
  if (!snapshotId) {
    console.error(
      `Usage: bun run scripts/snapshot.ts ${command} <projectSlug> <snapshotId>`,
    );
    process.exit(1);
  }

  if (command === "restore") {
    console.log(
      `Restoring snapshot "${snapshotId}" for "${projectSlug}"...`,
    );
    console.log(
      "WARNING: This will replace all current project data and cannot be undone.",
    );
    restoreSnapshot(projectSlug!, snapshotId);
    console.log("Snapshot restored successfully.");
    return;
  }

  if (command === "delete") {
    console.log(
      `Deleting snapshot "${snapshotId}" for "${projectSlug}"...`,
    );
    const result = deleteSnapshot(projectSlug!, snapshotId);
    console.log(`Snapshot deleted: ${JSON.stringify(result)}`);
    return;
  }

  console.error(
    "Usage: bun run scripts/snapshot.ts <create|list|restore|delete> <projectSlug> [extra]",
  );
  process.exit(1);
}

main().catch((error) => {
  console.error("Snapshot command failed:", error);
  process.exit(1);
});
