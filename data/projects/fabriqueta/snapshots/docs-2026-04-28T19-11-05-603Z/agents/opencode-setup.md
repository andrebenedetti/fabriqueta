# OpenCode Setup

This guide explains how to use Fabriqueta with [OpenCode](https://opencode.ai) to build and manage projects using AI agents.

## Prerequisites

- Fabriqueta repository cloned locally
- [Bun](https://bun.sh) installed
- OpenCode installed
- A target project directory you want to manage with Fabriqueta

## Overview

When you use Fabriqueta with OpenCode, you get:

- MCP tools and resources to read/write project state (backlog, sprint, documentation)
- Reusable skill files (`.claude/skills/`) that tell OpenCode's agent how to behave on your project
- A local database per project with full planning and documentation capabilities

## Step-by-Step Setup

### 1. Start the Fabriqueta MCP server

The MCP server runs over stdio. OpenCode connects to it through its MCP configuration. The server entry point is:

```
bun apps/mcp-server/src/index.ts
```

Run from the Fabriqueta repository root.

### 2. Configure OpenCode to use Fabriqueta

Add the Fabriqueta MCP server to your OpenCode configuration. The exact config location depends on your OpenCode setup (typically `.opencode.json` or system-wide MCP config).

The server should be configured as:

- **Server name:** `fabriqueta`
- **Transport:** stdio
- **Command:** `bun`
- **Args:** `apps/mcp-server/src/index.ts`
- **Working directory:** path to the Fabriqueta repository root

### 3. Deploy skills to your project

Fabriqueta includes reusable skill files in `.claude/skills/` that guide agent behavior. Deploy them to your target project:

```bash
# From the Fabriqueta repository root
bun run deploy-skills --target /path/to/your/project

# Or select specific skills
bun run deploy-skills --target /path/to/your/project --include session-init,soul,agent-execution,scrum-master
```

See `deploy-skills --list` for all available skills.

### 4. Create a Fabriqueta project for your codebase

Use the MCP tools to create a project:

1. Call `create_project` with your project name (e.g., "My App")
2. Call `create_epic` to define the main product areas
3. Call `create_task` to populate the backlog

Or let the agent do this automatically by copying the `project-bootstrap` skill into your project and asking the agent to run it.

### 5. Start your first sprint

1. Call `start_sprint` with a name like "Sprint 1"
2. Call `add_task_to_active_sprint` to move tasks into the sprint
3. Use the board view or MCP tools to track progress

### 6. Verify the setup

Ask OpenCode to:

1. List all Fabriqueta tools (should see `list_projects`, `get_project_board`, `create_task`, etc.)
2. Read the project board
3. Update a task status
4. Read project documentation

## Complete Example

Here's a walkthrough for setting up a hypothetical "Task Tracker" project:

```bash
# 1. Deploy skills to the new project
bun run deploy-skills --target ~/projects/task-tracker --include session-init,soul,agent-execution,project-bootstrap,scrum-master

# 2. OpenCode agent: create the Fabriqueta project
#    Agent calls: create_project(name: "Task Tracker")
#    → Creates project with slug "task-tracker"

# 3. OpenCode agent: set up epics and tasks
#    Agent calls:
#      create_epic(projectSlug: "task-tracker", title: "Core Features", description: "...")
#      create_task(projectSlug: "task-tracker", epicId: "...", title: "User authentication")
#      create_task(projectSlug: "task-tracker", epicId: "...", title: "Task CRUD API")

# 4. OpenCode agent: start a sprint
#    Agent calls:
#      start_sprint(projectSlug: "task-tracker", name: "Sprint 1")
#      add_task_to_active_sprint(projectSlug: "task-tracker", taskId: "...")

# 5. The agent claims and executes a task
#    Agent calls:
#      claim_task(projectSlug: "task-tracker", taskId: "...", claimedBy: "opencode")
#      update_task_status(projectSlug: "task-tracker", taskId: "...", status: "in_progress")
#      ... agent implements the feature ...
#      update_task_status(projectSlug: "task-tracker", taskId: "...", status: "done")
#      release_task(projectSlug: "task-tracker", taskId: "...")
```

## Skill Activation

When OpenCode starts working on a project that has Fabriqueta skills deployed, the agent should:

1. Load `session-init` skill first — it scans all available skills and loads matching ones
2. The `soul` skill then checks which roles are needed
3. Role-specific skills (engineering, scrum-master, etc.) guide execution

If `session-init` is not deployed, manually ask the agent to load relevant skills by description.

## Tips

- Always start a session by reading the active sprint so the agent has current context
- Prefer `update_task` for metadata changes and `update_task_status` for status transitions
- Use `claim_task` before starting work and `release_task` when done to avoid conflicts
- Write documentation updates as part of task completion, not as a separate step

## References

- Fabriqueta MCP server: `apps/mcp-server/src/index.ts`
- Skill files: `.claude/skills/`
- Project bootstrap skill: `.claude/skills/project-bootstrap/SKILL.md`
- Deploy script: `scripts/deploy-skills.ts`
