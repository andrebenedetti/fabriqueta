# Fabriqueta

First working slice of a local product-work operating system built with Bun, TypeScript, SQLite, React, and TanStack Router.

## Included in this step

- Create projects, each stored in its own SQLite file
- Create epics inside a project
- Create tasks inside each epic
- Manage markdown documentation pages and directories inside each project database
- Reorder epics and tasks with move up/down controls
- Expose the project system to AI agents through a local MCP server

## Run locally

1. Install dependencies:

   ```bash
   bun install
   ```

2. Start the API server:

   ```bash
   bun run dev:server
   ```

3. In another terminal, start the frontend:

   ```bash
   bun run dev:web
   ```

4. Open the frontend URL printed by Vite, usually `http://localhost:5173`.

5. If you want an AI host to connect through MCP, start the local MCP server:

   ```bash
   bun run dev:mcp
   ```

The Bun API runs on `http://localhost:3001` by default and stores project databases in `data/projects/`.
If that port is busy, start it with `PORT=3101 bun run dev:server` and update the Vite proxy if needed.

## MCP server

The project includes a local stdio MCP server at `apps/mcp-server/src/index.ts`.

It exposes:

- Tools for project operations such as listing projects, reading the board, creating epics/tasks, starting and completing sprints, assigning tasks to sprints, updating task status, reordering work, and managing documentation nodes.
- Resources for structured context such as:
  - `fabriqueta://projects`
  - `fabriqueta://projects/{projectSlug}/board`
  - `fabriqueta://projects/{projectSlug}/backlog`
  - `fabriqueta://projects/{projectSlug}/sprint`
  - `fabriqueta://projects/{projectSlug}/documentation`
  - `fabriqueta://projects/{projectSlug}/documentation/nodes/{nodeId}`
- Prompts for common agent workflows:
  - `plan-next-sprint`
  - `execute-active-sprint`
  - `review-project-documentation`

For local agent hosts that support MCP over stdio, point them at:

```bash
bun src/index.ts
```

with working directory:

```bash
apps/mcp-server
```
