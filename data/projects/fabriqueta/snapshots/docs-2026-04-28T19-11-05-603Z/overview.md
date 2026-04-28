# Fabriqueta

Fabriqueta is a local product-work operating system for planning, documenting, and executing product development inside a self-contained project workspace. Each project owns its own SQLite database so the backlog, sprint state, and documentation all travel together as one portable unit.

## Product Goal

Help a human operator or AI agent run a product from specification to execution without losing context between planning, documentation, and delivery work. The ultimate ambition is for AI agents to autonomously pick up tasks from the sprint, execute them, update the board, and keep documentation current — with a human providing guidance and reviewing outcomes.

## Reusable Skill System

AI orchestration improvements (agent execution contracts, task claiming, context budgeting, approval checkpoints) are packaged as reusable skills in `.claude/skills/`. Any project using Fabriqueta can adopt these skills by copying the relevant directories, making agent behavior consistent across projects without re-inventing the operating model.

## Current Backlog State

Fabriqueta is built using its own system (dogfooding). The current backlog contains **6 epics** with **41 tasks** covering:

1. **Product Foundations & Specification System** — Documentation templates, task-to-doc linking, decision log, filesystem sync
2. **Backlog & Sprint Workflow** — Largely complete (7/9 done)
3. **Agent Operating Model** — All outputs are reusable skills, not project-specific docs
4. **MCP Server & Context APIs** — Parity fixes, search, context bundles, concurrency
5. **Cross-Agent Integrations** — Setup guides done; prompt templates as reusable skills
6. **Cost Efficiency & Reliability** — Summary resources, context budgeting skill, audit log

## Current Implemented Scope

- Project list and project creation
- Per-project SQLite databases (portable, isolated)
- Epics and ordered tasks with move up/down
- Sprint planning with one active sprint at a time
- Board view for active sprint execution (todo → in_progress → done)
- Sprint history with retrospective notes and completion stats
- Backlog view with filters (by epic, status), search, and sorting
- Task details dialog for focused editing
- Documentation view with markdown pages and nested directories
- Confirmation dialogs before destructive actions
- MCP server with 20+ tools, 7 resources, 3 prompts for AI agent access
- 11 reusable skills in `.claude/skills/` for agent behavior

## Core Product Principles

1. A project should be self-contained.
2. Humans and agents should operate on the same source of truth.
3. Product documentation and task execution should stay tightly connected.
4. Local-first operation is preferred over deployment complexity.
5. **AI orchestration patterns must be reusable across projects** — skills in `.claude/skills/`, not buried in any single project's docs.
6. The tool should manage its own development (dogfooding).

## Expected Direction

Fabriqueta is moving toward a workflow where an AI agent can:

- read specifications and backlog state
- choose or receive work via claiming protocol (guided by reusable skills)
- execute work while updating task status
- keep product documentation current as implementation evolves
- leave an audit trail of all changes made
- hand off cleanly for the next agent or human review

All of this is guided by **reusable skill files** that any Fabriqueta project can adopt.

## Related Pages

- product/core-workflow.md — Operating model and entity relationships
- product/scope-non-goals-and-metrics.md — Product vision and quality bar
- product/backlog-structure.md — Backlog architecture and epic descriptions
- architecture/system-architecture.md — Stack and design tradeoffs
- agents/mcp-operations.md — MCP capabilities and agent workflow
