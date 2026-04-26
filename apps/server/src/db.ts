import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Database } from "bun:sqlite";

export type ProjectSummary = {
  slug: string;
  name: string;
  createdAt: string;
  epicCount: number;
  taskCount: number;
};

export type ProjectDetails = {
  slug: string;
  name: string;
  createdAt: string;
};

export type SprintStatus = "active" | "completed";

export type SprintRow = {
  id: string;
  name: string;
  status: SprintStatus;
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
};

export type EpicRow = {
  id: string;
  title: string;
  description: string;
  position: number;
  createdAt: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskRow = {
  id: string;
  epicId: string;
  title: string;
  description: string;
  position: number;
  status: TaskStatus;
  sprintId: string | null;
  createdAt: string;
};

export type SprintTaskRow = TaskRow & {
  epicTitle: string;
};

export type DocumentationNodeKind = "directory" | "page";

export type DocumentationNodeRow = {
  id: string;
  parentId: string | null;
  name: string;
  kind: DocumentationNodeKind;
  position: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentationNode = DocumentationNodeRow & {
  path: string;
  children: DocumentationNode[];
};

export type ProjectDocumentation = {
  project: ProjectDetails;
  nodes: DocumentationNode[];
};

const projectsDirectory = Bun.env.FABRIQUETA_PROJECTS_DIR
  ? resolve(Bun.env.FABRIQUETA_PROJECTS_DIR)
  : resolve(import.meta.dir, "../../../data/projects");

mkdirSync(projectsDirectory, { recursive: true });

function initializeProjectSchema(db: Database) {
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS project_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS epics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_epics_position
    ON epics(position);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      epic_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE CASCADE,
      CHECK (status IN ('todo', 'in_progress', 'done'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_epic_position
    ON tasks(epic_id, position);

    CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      CHECK (status IN ('active', 'completed'))
    );

    CREATE TABLE IF NOT EXISTS documentation_nodes (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      position INTEGER NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES documentation_nodes(id) ON DELETE CASCADE,
      CHECK (kind IN ('directory', 'page'))
    );

    CREATE INDEX IF NOT EXISTS idx_documentation_parent_position
    ON documentation_nodes(parent_id, position);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_documentation_sibling_name
    ON documentation_nodes(COALESCE(parent_id, ''), name);
  `);

  const sprintIdColumn = db
    .query<{ name: string }, []>(`
      SELECT name
      FROM pragma_table_info('tasks')
      WHERE name = 'sprint_id'
    `)
    .get();

  if (!sprintIdColumn) {
    db.exec("ALTER TABLE tasks ADD COLUMN sprint_id TEXT;");
  }
}

function projectPath(slug: string) {
  return resolve(projectsDirectory, `${slug}.sqlite`);
}

function sanitizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assertValidSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid project slug");
  }
}

function assertValidDocumentationName(name: string) {
  if (!name.trim()) {
    throw new Error("Documentation name is required");
  }

  if (name === "." || name === "..") {
    throw new Error("Documentation name is invalid");
  }

  if (/[\\/]/.test(name)) {
    throw new Error("Documentation names cannot contain slashes");
  }
}

function normalizeDocumentationName(kind: DocumentationNodeKind, name: string) {
  const trimmedName = name.trim();
  assertValidDocumentationName(trimmedName);

  if (kind === "page" && !trimmedName.toLowerCase().endsWith(".md")) {
    return `${trimmedName}.md`;
  }

  return trimmedName;
}

function openProjectDb(slug: string) {
  assertValidSlug(slug);

  const path = projectPath(slug);
  if (!existsSync(path)) {
    throw new Error("Project not found");
  }

  const db = new Database(path);
  initializeProjectSchema(db);
  return db;
}

function withProjectDb<T>(slug: string, fn: (db: Database) => T) {
  const db = openProjectDb(slug);

  try {
    return fn(db);
  } finally {
    db.close();
  }
}

function readProjectDetails(db: Database) {
  const project = db
    .query<ProjectDetails, []>(`
      SELECT
        slug,
        name,
        created_at AS createdAt
      FROM project_info
      WHERE id = 1
    `)
    .get();

  if (!project) {
    throw new Error("Project metadata is missing");
  }

  return project;
}

function readProjectSummary(db: Database) {
  const details = readProjectDetails(db);
  const counts = db
    .query<{ epicCount: number; taskCount: number }, []>(`
      SELECT
        (SELECT COUNT(*) FROM epics) AS epicCount,
        (SELECT COUNT(*) FROM tasks) AS taskCount
    `)
    .get();

  return {
    ...details,
    epicCount: counts?.epicCount ?? 0,
    taskCount: counts?.taskCount ?? 0,
  };
}

function ensureProjectFile(input: { slug: string; name: string }) {
  const path = projectPath(input.slug);
  if (existsSync(path)) {
    return;
  }

  const db = new Database(path, { create: true });

  try {
    initializeProjectSchema(db);
    db.query(`
      INSERT INTO project_info (id, slug, name, created_at)
      VALUES (1, ?, ?, CURRENT_TIMESTAMP)
    `).run(input.slug, input.name);
  } finally {
    db.close();
  }
}

function nextAvailableSlug(baseSlug: string) {
  const normalizedBase = baseSlug || "project";
  let candidate = normalizedBase;
  let suffix = 2;

  while (existsSync(projectPath(candidate))) {
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function listProjectFiles() {
  return readdirSync(projectsDirectory)
    .filter((fileName) => fileName.endsWith(".sqlite"))
    .map((fileName) => fileName.slice(0, -".sqlite".length))
    .sort((left, right) => left.localeCompare(right));
}

function requireEpic(db: Database, epicId: string) {
  const epic = db
    .query<EpicRow, [string]>(`
      SELECT
        id,
        title,
        description,
        position,
        created_at AS createdAt
      FROM epics
      WHERE id = ?
    `)
    .get(epicId);

  if (!epic) {
    throw new Error("Epic not found");
  }

  return epic;
}

function requireTask(db: Database, taskId: string) {
  const task = db
    .query<TaskRow, [string]>(`
      SELECT
        id,
        epic_id AS epicId,
        title,
        description,
        position,
        status,
        sprint_id AS sprintId,
        created_at AS createdAt
      FROM tasks
      WHERE id = ?
    `)
    .get(taskId);

  if (!task) {
    throw new Error("Task not found");
  }

  return task;
}

function requireDocumentationNode(db: Database, nodeId: string) {
  const node = db
    .query<DocumentationNodeRow, [string]>(`
      SELECT
        id,
        parent_id AS parentId,
        name,
        kind,
        position,
        content,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM documentation_nodes
      WHERE id = ?
    `)
    .get(nodeId);

  if (!node) {
    throw new Error("Documentation node not found");
  }

  return node;
}

function requireDocumentationDirectory(db: Database, parentId: string | null) {
  if (parentId === null) {
    return null;
  }

  const parent = requireDocumentationNode(db, parentId);
  if (parent.kind !== "directory") {
    throw new Error("Documentation pages cannot contain child nodes");
  }

  return parent;
}

function siblingNameExists(
  db: Database,
  parentId: string | null,
  name: string,
  excludedNodeId?: string,
) {
  const match = excludedNodeId
    ? db
        .query<{ id: string }, [string | null, string, string]>(`
          SELECT id
          FROM documentation_nodes
          WHERE COALESCE(parent_id, '') = COALESCE(?, '')
            AND name = ?
            AND id != ?
          LIMIT 1
        `)
        .get(parentId, name, excludedNodeId)
    : db
        .query<{ id: string }, [string | null, string]>(`
          SELECT id
          FROM documentation_nodes
          WHERE COALESCE(parent_id, '') = COALESCE(?, '')
            AND name = ?
          LIMIT 1
        `)
        .get(parentId, name);

  return Boolean(match);
}

function nextDocumentationPosition(db: Database, parentId: string | null) {
  return (
    db
      .query<{ value: number | null }, [string | null]>(`
        SELECT MAX(position) AS value
        FROM documentation_nodes
        WHERE COALESCE(parent_id, '') = COALESCE(?, '')
      `)
      .get(parentId)?.value ?? -1
  ) + 1;
}

function buildDocumentationTree(
  rows: DocumentationNodeRow[],
  parentId: string | null = null,
  parentPath = "",
): DocumentationNode[] {
  return rows
    .filter((row) => row.parentId === parentId)
    .map((row) => {
      const path = parentPath ? `${parentPath}/${row.name}` : row.name;
      const children = row.kind === "directory" ? buildDocumentationTree(rows, row.id, path) : [];

      return {
        ...row,
        path,
        children,
      };
    });
}

function readProjectDocumentation(db: Database): ProjectDocumentation {
  const project = readProjectDetails(db);
  const rows = db
    .query<DocumentationNodeRow, []>(`
      SELECT
        id,
        parent_id AS parentId,
        name,
        kind,
        position,
        content,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM documentation_nodes
      ORDER BY position ASC, created_at ASC
    `)
    .all();

  return {
    project,
    nodes: buildDocumentationTree(rows),
  };
}

function getActiveSprint(db: Database) {
  return db
    .query<SprintRow, []>(`
      SELECT
        id,
        name,
        status,
        created_at AS createdAt,
        started_at AS startedAt,
        completed_at AS completedAt
      FROM sprints
      WHERE status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `)
    .get();
}

function requireActiveSprint(db: Database) {
  const sprint = getActiveSprint(db);
  if (!sprint) {
    throw new Error("No active sprint");
  }

  return sprint;
}

export function listProjects() {
  return listProjectFiles()
    .map((slug) => {
      const db = openProjectDb(slug);

      try {
        return readProjectSummary(db);
      } finally {
        db.close();
      }
    })
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function createProject(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Project name is required");
  }

  const slug = nextAvailableSlug(sanitizeSlug(trimmedName));
  ensureProjectFile({ slug, name: trimmedName });

  return withProjectDb(slug, (db) => readProjectSummary(db));
}

export function createEpic(projectSlug: string, input: { title: string; description?: string }) {
  return withProjectDb(projectSlug, (db) => {
    const title = input.title.trim();
    const description = input.description?.trim() ?? "";

    if (!title) {
      throw new Error("Epic title is required");
    }

    const position =
      (db.query<{ value: number | null }, []>(`SELECT MAX(position) AS value FROM epics`).get()
        ?.value ?? -1) + 1;

    const epicId = crypto.randomUUID();

    db.query(`
      INSERT INTO epics (id, title, description, position)
      VALUES (?, ?, ?, ?)
    `).run(epicId, title, description, position);

    return requireEpic(db, epicId);
  });
}

export function updateEpic(
  projectSlug: string,
  epicId: string,
  input: { title: string; description?: string },
) {
  return withProjectDb(projectSlug, (db) => {
    const current = requireEpic(db, epicId);
    const title = input.title.trim();
    const description = input.description?.trim() ?? current.description;

    if (!title) {
      throw new Error("Epic title is required");
    }

    db.query(`
      UPDATE epics
      SET title = ?, description = ?
      WHERE id = ?
    `).run(title, description, epicId);

    return requireEpic(db, epicId);
  });
}

export function createTask(projectSlug: string, epicId: string, input: { title: string; description?: string }) {
  return withProjectDb(projectSlug, (db) => {
    requireEpic(db, epicId);

    const title = input.title.trim();
    const description = input.description?.trim() ?? "";

    if (!title) {
      throw new Error("Task title is required");
    }

    const position =
      (db
        .query<{ value: number | null }, [string]>(`
          SELECT MAX(position) AS value
          FROM tasks
          WHERE epic_id = ?
        `)
        .get(epicId)?.value ?? -1) + 1;

    const taskId = crypto.randomUUID();

    db.query(`
      INSERT INTO tasks (id, epic_id, title, description, position, status, sprint_id)
      VALUES (?, ?, ?, ?, ?, 'todo', NULL)
    `).run(taskId, epicId, title, description, position);

    return requireTask(db, taskId);
  });
}

export function updateTask(
  projectSlug: string,
  taskId: string,
  input: { title: string; description?: string; status?: TaskStatus },
) {
  return withProjectDb(projectSlug, (db) => {
    const current = requireTask(db, taskId);
    const title = input.title.trim();
    const description = input.description?.trim() ?? current.description;
    const status = input.status ?? current.status;

    if (!title) {
      throw new Error("Task title is required");
    }

    db.query(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?
      WHERE id = ?
    `).run(title, description, status, taskId);

    return requireTask(db, taskId);
  });
}

export function startSprint(projectSlug: string, input: { name: string }) {
  return withProjectDb(projectSlug, (db) => {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Sprint name is required");
    }

    if (getActiveSprint(db)) {
      throw new Error("Complete the active sprint before starting a new one");
    }

    const sprintId = crypto.randomUUID();

    db.query(`
      INSERT INTO sprints (id, name, status, created_at, started_at, completed_at)
      VALUES (?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
    `).run(sprintId, name);

    return requireActiveSprint(db);
  });
}

export function completeActiveSprint(projectSlug: string) {
  return withProjectDb(projectSlug, (db) => {
    const sprint = requireActiveSprint(db);

    db.query(`
      UPDATE sprints
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sprint.id);

    return sprint.id;
  });
}

export function addTaskToActiveSprint(projectSlug: string, taskId: string) {
  return withProjectDb(projectSlug, (db) => {
    const task = requireTask(db, taskId);
    const sprint = requireActiveSprint(db);

    db.query(`
      UPDATE tasks
      SET sprint_id = ?
      WHERE id = ?
    `).run(sprint.id, task.id);

    return requireTask(db, task.id);
  });
}

export function removeTaskFromSprint(projectSlug: string, taskId: string) {
  return withProjectDb(projectSlug, (db) => {
    const task = requireTask(db, taskId);

    db.query(`
      UPDATE tasks
      SET sprint_id = NULL
      WHERE id = ?
    `).run(task.id);

    return requireTask(db, task.id);
  });
}

export function moveEpic(projectSlug: string, epicId: string, direction: "up" | "down") {
  return withProjectDb(projectSlug, (db) => {
    const move = db.transaction(() => {
      const epic = requireEpic(db, epicId);
      const targetPosition = epic.position + (direction === "up" ? -1 : 1);

      if (targetPosition < 0) {
        return epic;
      }

      const adjacent = db
        .query<{ id: string }, [number]>(`
          SELECT id
          FROM epics
          WHERE position = ?
        `)
        .get(targetPosition);

      if (!adjacent) {
        return epic;
      }

      db.query(`UPDATE epics SET position = -1 WHERE id = ?`).run(epic.id);
      db.query(`UPDATE epics SET position = ? WHERE id = ?`).run(epic.position, adjacent.id);
      db.query(`UPDATE epics SET position = ? WHERE id = ?`).run(targetPosition, epic.id);

      return requireEpic(db, epic.id);
    });

    return move();
  });
}

export function moveTask(projectSlug: string, taskId: string, direction: "up" | "down") {
  return withProjectDb(projectSlug, (db) => {
    const move = db.transaction(() => {
      const task = requireTask(db, taskId);
      const targetPosition = task.position + (direction === "up" ? -1 : 1);

      if (targetPosition < 0) {
        return task;
      }

      const adjacent = db
        .query<{ id: string }, [string, number]>(`
          SELECT id
          FROM tasks
          WHERE epic_id = ? AND position = ?
        `)
        .get(task.epicId, targetPosition);

      if (!adjacent) {
        return task;
      }

      db.query(`UPDATE tasks SET position = -1 WHERE id = ?`).run(task.id);
      db.query(`UPDATE tasks SET position = ? WHERE id = ?`).run(task.position, adjacent.id);
      db.query(`UPDATE tasks SET position = ? WHERE id = ?`).run(targetPosition, task.id);

      return requireTask(db, task.id);
    });

    return move();
  });
}

export function createDocumentationNode(
  projectSlug: string,
  input: {
    kind: DocumentationNodeKind;
    parentId?: string | null;
    name: string;
    content?: string;
  },
) {
  return withProjectDb(projectSlug, (db) => {
    const parentId = input.parentId ?? null;
    requireDocumentationDirectory(db, parentId);

    const name = normalizeDocumentationName(input.kind, input.name);
    if (siblingNameExists(db, parentId, name)) {
      throw new Error("A documentation entry with that name already exists here");
    }

    const nodeId = crypto.randomUUID();
    const position = nextDocumentationPosition(db, parentId);
    const content = input.kind === "page" ? input.content ?? "" : "";

    db.query(`
      INSERT INTO documentation_nodes (id, parent_id, name, kind, position, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nodeId, parentId, name, input.kind, position, content);

    return requireDocumentationNode(db, nodeId);
  });
}

export function updateDocumentationNode(
  projectSlug: string,
  nodeId: string,
  input: {
    name?: string;
    content?: string;
  },
) {
  return withProjectDb(projectSlug, (db) => {
    const current = requireDocumentationNode(db, nodeId);
    const name =
      input.name === undefined
        ? current.name
        : normalizeDocumentationName(current.kind, input.name);

    if (siblingNameExists(db, current.parentId, name, current.id)) {
      throw new Error("A documentation entry with that name already exists here");
    }

    const content = current.kind === "page" ? input.content ?? current.content : "";

    db.query(`
      UPDATE documentation_nodes
      SET name = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, content, nodeId);

    return requireDocumentationNode(db, nodeId);
  });
}

export function deleteDocumentationNode(projectSlug: string, nodeId: string) {
  return withProjectDb(projectSlug, (db) => {
    const node = requireDocumentationNode(db, nodeId);
    db.query(`DELETE FROM documentation_nodes WHERE id = ?`).run(nodeId);
    return node.id;
  });
}

export function getProjectDocumentation(projectSlug: string) {
  return withProjectDb(projectSlug, (db) => readProjectDocumentation(db));
}

export function getProjectBoard(projectSlug: string) {
  return withProjectDb(projectSlug, (db) => {
    const project = readProjectDetails(db);
    const activeSprint = getActiveSprint(db) ?? null;
    const epics = db
      .query<EpicRow, []>(`
        SELECT
          id,
          title,
          description,
          position,
          created_at AS createdAt
        FROM epics
        ORDER BY position ASC, created_at ASC
      `)
      .all()
      .map((epic) => ({
        ...epic,
        tasks: db
          .query<TaskRow, [string]>(`
            SELECT
              id,
              epic_id AS epicId,
              title,
              description,
              position,
              status,
              sprint_id AS sprintId,
              created_at AS createdAt
            FROM tasks
            WHERE epic_id = ?
            ORDER BY position ASC, created_at ASC
          `)
          .all(epic.id),
      }));

    const sprintTasks = activeSprint
      ? db
          .query<SprintTaskRow, [string]>(`
            SELECT
              tasks.id,
              tasks.epic_id AS epicId,
              tasks.title,
              tasks.description,
              tasks.position,
              tasks.status,
              tasks.sprint_id AS sprintId,
              tasks.created_at AS createdAt,
              epics.title AS epicTitle
            FROM tasks
            INNER JOIN epics ON epics.id = tasks.epic_id
            WHERE tasks.sprint_id = ?
            ORDER BY epics.position ASC, tasks.position ASC, tasks.created_at ASC
          `)
          .all(activeSprint.id)
      : [];

    return { project, activeSprint, sprintTasks, epics };
  });
}

ensureProjectFile({ slug: "fabriqueta", name: "Fabriqueta" });
