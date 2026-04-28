import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import {
  createDocumentationNode,
  getProjectDocumentation,
  updateDocumentationNode,
  deleteDocumentationNode,
  type DocumentationNode,
} from "../apps/server/src/db";

const DOCS_DIR_NAME = "docs";

function listProjects() {
  const projectsDir = resolve(import.meta.dir, "../data/projects");
  if (!existsSync(projectsDir)) return [];
  return readdirSync(projectsDir)
    .filter((f) => f.endsWith(".sqlite"))
    .map((f) => f.replace(/\.sqlite$/, ""));
}

function exportNodeToFile(node: DocumentationNode, basePath: string) {
  const nodePath = join(basePath, node.name);

  if (node.kind === "directory") {
    if (!existsSync(nodePath)) {
      mkdirSync(nodePath, { recursive: true });
      console.log(`  Created directory: ${node.name}/`);
    }
    for (const child of node.children) {
      exportNodeToFile(child, nodePath);
    }
  } else {
    writeFileSync(nodePath, node.content, "utf-8");
    console.log(`  Wrote: ${node.name}`);
  }
}

function getNodeMap(
  nodes: DocumentationNode[],
  parentPath = "",
): Map<string, DocumentationNode> {
  const map = new Map<string, DocumentationNode>();
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    map.set(path, node);
    if (node.kind === "directory") {
      const childMap = getNodeMap(node.children, path);
      for (const [key, value] of childMap) {
        map.set(key, value);
      }
    }
  }
  return map;
}

async function exportDocumentation(projectSlug: string, outputDir?: string) {
  const docsDir = outputDir ?? join(resolve(import.meta.dir, ".."), DOCS_DIR_NAME);
  mkdirSync(docsDir, { recursive: true });

  const documentation = getProjectDocumentation(projectSlug);
  let count = 0;

  for (const node of documentation.nodes) {
    exportNodeToFile(node, docsDir);
    count += 1 + countNestedPages(node);
  }

  console.log(`Exported ${count} node(s) to ${docsDir}`);
  return { path: docsDir, count };
}

function countNestedPages(node: DocumentationNode): number {
  if (node.kind === "page") return 1;
  return node.children.reduce((sum, child) => sum + countNestedPages(child), 0);
}

interface ImportStats {
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
}

async function importDocumentation(projectSlug: string, inputDir?: string) {
  const docsDir = inputDir ?? join(resolve(import.meta.dir, ".."), DOCS_DIR_NAME);
  const stats: ImportStats = { created: 0, updated: 0, skipped: 0, deleted: 0 };

  if (!existsSync(docsDir)) {
    console.error(`Directory not found: ${docsDir}`);
    return stats;
  }

  const existing = getProjectDocumentation(projectSlug);
  const existingMap = getNodeMap(existing.nodes);

  const filesToProcess: string[] = [];

  function collectFiles(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
        filesToProcess.push(relative(docsDir, fullPath) + "/");
      } else if (entry.name.endsWith(".md")) {
        filesToProcess.push(relative(docsDir, fullPath));
      }
    }
  }

  collectFiles(docsDir);

  const processedPaths = new Set<string>();

  for (const filePath of filesToProcess) {
    const fullPath = join(docsDir, filePath);
    const isDir = filePath.endsWith("/");
    const nodeName = filePath.split("/").pop() ?? filePath;
    const parentPath = filePath.split("/").slice(0, -1).join("/");
    const normalizedPath = isDir ? filePath.slice(0, -1) : filePath;

    processedPaths.add(normalizedPath);

    const existingNode = existingMap.get(normalizedPath);

    if (isDir) {
      if (!existingNode) {
        const parentId = findParentId(existing.nodes, parentPath);
        const created = createDocumentationNode(projectSlug, {
          kind: "directory",
          parentId,
          name: nodeName,
        });
        existingMap.set(normalizedPath, {
          ...created,
          path: normalizedPath,
          children: [],
        });
        stats.created++;
        console.log(`  Created directory: ${normalizedPath}/`);
      } else {
        stats.skipped++;
      }
    } else {
      const content = readFileSync(fullPath, "utf-8");

      if (!existingNode) {
        const parentId = findParentId(existing.nodes, parentPath);
        const created = createDocumentationNode(projectSlug, {
          kind: "page",
          parentId,
          name: nodeName,
          content,
        });
        existingMap.set(normalizedPath, {
          ...created,
          path: normalizedPath,
          children: [],
        });
        stats.created++;
        console.log(`  Created: ${normalizedPath}`);
      } else {
        const fsMtime = statSync(fullPath).mtime.toISOString();
        const dbUpdated = existingNode.updatedAt;

        if (fsMtime > dbUpdated) {
          updateDocumentationNode(projectSlug, existingNode.id, { content });
          stats.updated++;
          console.log(`  Updated: ${normalizedPath}`);
        } else {
          stats.skipped++;
        }
      }
    }
  }

  for (const [path, node] of existingMap) {
    if (!processedPaths.has(path)) {
      deleteDocumentationNode(projectSlug, node.id);
      stats.deleted++;
      console.log(`  Deleted: ${path}`);
    }
  }

  console.log(
    `Import complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.deleted} deleted`,
  );
  return stats;
}

function findParentId(
  nodes: DocumentationNode[],
  parentPath: string,
): string | null {
  if (!parentPath) return null;
  const map = getNodeMap(nodes);
  const parent = map.get(parentPath);
  return parent?.id ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const projectSlug = args[1];

  if (!projectSlug) {
    const projects = listProjects();
    if (projects.length === 0) {
      console.error("No projects found.");
      process.exit(1);
    }
    console.error("Usage: bun run scripts/doc-sync.ts <export|import> <projectSlug> [path]");
    console.error(`Available projects: ${projects.join(", ")}`);
    process.exit(1);
  }

  const pathArg = args[2];

  if (command === "export") {
    console.log(`Exporting documentation for "${projectSlug}"...`);
    await exportDocumentation(projectSlug, pathArg);
  } else if (command === "import") {
    console.log(`Importing documentation for "${projectSlug}"...`);
    await importDocumentation(projectSlug, pathArg);
  } else {
    console.error('Usage: bun run scripts/doc-sync.ts <export|import> <projectSlug> [path]');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
