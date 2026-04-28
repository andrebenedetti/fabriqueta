# Fabriqueta

A local product-work operating system for planning, documenting, and executing product development with AI agents. Built with Bun, TypeScript, SQLite, React, and TanStack Router.

- Backlog management (epics, tasks, sprints)
- Markdown documentation per project
- MCP server so AI agents can read and update project state
- Reusable skill files (`.claude/skills/`) that guide agent behavior
- Task claiming protocol for multi-agent safety

## Using Fabriqueta with your project

To manage and build a new project using Fabriqueta with an AI agent (OpenCode, Claude Code, etc.):

### 1. Prerequisites

- [Bun](https://bun.sh) installed
- Fabriqueta repository cloned
- Your target project directory exists

### 2. Deploy skills to your project

Fabriqueta includes reusable skill files that tell AI agents how to behave. Deploy them to your project:

```bash
bun run deploy-skills --target /path/to/your/project

# Or select specific skills
bun run deploy-skills --target /path/to/your/project --include session-init,soul,agent-execution,scrum-master

# List available skills
bun run deploy-skills --list
```

### 3. Configure MCP for your agent

Point your AI agent at the Fabriqueta MCP server. For OpenCode, configure as:

- **Server name:** `fabriqueta`
- **Transport:** stdio
- **Command:** `bun`
- **Args:** `apps/mcp-server/src/index.ts`
- **Working directory:** (Fabriqueta repo root)

For Claude Code:
```bash
claude mcp add fabriqueta --scope project -- bun apps/mcp-server/src/index.ts
```

### 4. Create a project and start working

Ask your agent to create a Fabriqueta project for your codebase, set up epics, start a sprint, and begin executing tasks. The `project-bootstrap` skill can automate this entire flow.

See `agents/opencode-setup.md` for a complete walkthrough.

## Run locally (for Fabriqueta development)

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

- **24 tools** for project operations: list/create projects, read boards/backlogs, create/update/delete epics and tasks, start/complete sprints, manage sprint assignments, update task status, claim/release tasks, reorder work, manage documentation nodes, and read task context.
- **7 resources** for structured context:
  - `fabriqueta://projects`
  - `fabriqueta://projects/{projectSlug}/board`
  - `fabriqueta://projects/{projectSlug}/backlog`
  - `fabriqueta://projects/{projectSlug}/sprint`
  - `fabriqueta://projects/{projectSlug}/tasks/{taskId}`
  - `fabriqueta://projects/{projectSlug}/documentation`
  - `fabriqueta://projects/{projectSlug}/documentation/nodes/{nodeId}`
- **3 prompts** for common agent workflows:
  - `plan-next-sprint`
  - `execute-active-sprint`
  - `review-project-documentation`

For local agent hosts that support MCP over stdio, point them at:

```bash
bun apps/mcp-server/src/index.ts
```

from the Fabriqueta repository root.

## Skill files

Reusable AI agent behavior guides in `.claude/skills/`:

- `session-init` — Mandatory skill bootloader (discovers and loads matching skills)
- `soul` — Role discovery and pull-in gateway
- `scrum-master` — Sprint planning, backlog grooming, work sequencing
- `agent-execution` — Canonical pre-flight, execution loop, and completion contract
- `project-bootstrap` — Self-bootstrap a new project from zero
- `engineering` — Technical design and implementation planning
- `product-management` — Epic/story/task definition and prioritization
- `qa-testing` — Test planning and edge case discovery
- `design` — User flows, screens, and interaction design
- `autonomous-delivery` — Multi-hour autonomous run loop
- `documentation` — Keeping docs accurate and writing decision records
- `writing-good-tasks` — Task template with acceptance criteria
- `writing-good-epics` — Epic template with success criteria
- `retro-continuous-improvement` — Retro recaps and process improvement

Any project can adopt these skills by deploying them with the `deploy-skills` script.
