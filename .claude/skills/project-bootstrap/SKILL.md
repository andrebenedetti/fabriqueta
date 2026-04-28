---
name: project-bootstrap
description: Use this skill when setting up Fabriqueta for a brand new project. The agent will self-bootstrap: create a Fabriqueta project, deploy skills, configure MCP, and set up the initial backlog and sprint.
---

# Project Bootstrap Skill

Use this skill when setting up Fabriqueta for a brand new project. The agent will self-bootstrap the project from zero to an active sprint.

## Prerequisites

- Fabriqueta repository is cloned and available locally.
- Bun is installed.
- The target project directory exists.

## Bootstrap Steps

### 1. Check for existing Fabriqueta project

Use `list_projects` to check if a project for this codebase already exists. If it does, skip creation and proceed to skill setup.

### 2. Create a Fabriqueta project

Use `create_project` with the project name matching the codebase name or the product name. The name will be slugified automatically.

### 3. Deploy Fabriqueta skills

Run the skill-deploy script from the Fabriqueta root to copy skills into the target project:

```bash
bun run deploy-skills --target <path-to-target-project>
```

Include at minimum:
- `session-init` — mandatory skill bootloader
- `soul` — role discovery gateway
- `scrum-master` — sprint management
- `agent-execution` — execution contract
- `project-bootstrap` — this skill (can re-run for idempotency)

### 4. Configure the MCP server

Ensure the target project's MCP configuration points to the Fabriqueta MCP server:

For OpenCode: The Fabriqueta MCP tools are available via the MCP server. The server entry point is `apps/mcp-server/src/index.ts` in the Fabriqueta repository, run with `bun`.

For Claude Code: Add with:
```bash
claude mcp add fabriqueta --scope project -- bun apps/mcp-server/src/index.ts
```

### 5. Create initial epics and backlog

Create 1-3 epics covering the main product areas. Use `create_epic` with descriptive titles and goals.

Create initial tasks under each epic using `create_task`. Include clear descriptions with acceptance criteria.

### 6. Start the first sprint

Use `start_sprint` with a meaningful name (e.g., "Sprint 1" or "Foundation Sprint").

Add the highest-priority tasks to the sprint using `add_task_to_active_sprint`.

### 7. Verify

Read the board back using `get_project_board` and confirm:
- The project exists
- Epics and tasks are present
- The sprint is active with the right tasks
- Skills are loaded (via session-init or manual check)

## Idempotency

This skill is safe to re-run. It checks for existing project existence before creating, and the deploy-skills script skips existing directories by default.
