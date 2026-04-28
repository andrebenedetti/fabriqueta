# Backlog Structure

This page documents the current backlog architecture for Fabriqueta's own dogfooding development.

## Epic Overview

### 1. Product Foundations & Specification System
**Goal:** Make the documentation system strong enough to become the canonical source of truth for product decisions, specifications, and operational context.

**Key deliverables:**
- Standard spec page templates (overview, architecture, flows, decisions)
- Task-to-documentation linking (tasks reference the spec pages they implement)
- Decision log (ADR format, stored in documentation tree)
- Filesystem ↔ database documentation sync (edit docs in IDE, sync to Fabriqueta)

**Status:** 1 task done, 6 tasks remaining.

### 2. Backlog & Sprint Workflow
**Goal:** Make planning and execution robust enough for day-to-day product delivery.

**Status:** 7 tasks done, 2 tasks remaining (task dependencies, bulk sprint planning).

### 3. Agent Operating Model
**Goal:** Define how AI agents should behave so they improve project momentum instead of creating drift or confusion.

**Key deliverables (all reusable skills, not project-specific docs):**
- `agent-execution/SKILL.md` — Canonical operating procedure (preflight, execution loop, completion)
- `completion/SKILL.md` — Mandatory board/doc update checklist on task completion
- `task-selection/SKILL.md` — Next-task selection with priority criteria
- `approval-checkpoints/SKILL.md` — Human approval gates for risky actions
- `agent-execution/` also covers claiming protocol for multi-agent safety
- Activity timeline/audit trail as MCP resource

**Status:** 0 tasks done, 6 tasks remaining. **This is the highest-impact epic.**

### 4. MCP Server & Context APIs
**Goal:** Expand the MCP surface so agents can work with richer context and safer write operations.

**Key deliverables:**
- Documentation search MCP resource
- Task context bundle resource (composite: task + epic + sprint + linked docs)
- update_epic MCP tool (parity fix)
- update_task standalone MCP tool (parity fix)
- Optimistic concurrency
- Extended MCP integration tests

**Status:** 1 task done, 7 tasks remaining.

### 5. Cross-Agent Integrations (Codex, Claude, Cursor)
**Goal:** Make Fabriqueta feel first-class across major agent environments.

**Key deliverables:**
- MCP setup guides for Codex, Claude, Cursor (done, as project docs)
- `agent-prompts/` — Reusable execution prompt skill files for each agent
- `agent-tips/` — Reusable operating tips skill files for each agent
- End-to-end project operation tests in each agent

**Status:** 1 task done, 4 tasks remaining.

### 6. Cost Efficiency & Reliability
**Goal:** Reduce token waste, improve repeatability, and keep the project trustworthy.

**Key deliverables:**
- Compact summary MCP resources for low-token planning
- `context-budgeting/SKILL.md` — Reusable context load order and token budgets
- Project backup and restore workflow
- Automated regression checks
- Backlog and sprint hygiene heuristics
- Project-level audit/activity log

**Status:** 0 tasks done, 6 tasks remaining.

## Backlog Totals

- 6 epics
- 41 tasks total (10 done, 31 todo)
- 1 active sprint: "Agentic Foundation & Backlog Curation"

## Active Sprint

The sprint "Agentic Foundation & Backlog Curation" focuses on the critical path to making Fabriqueta agent-safe. Tasks produce code (MCP tools, claimed_by field) and reusable skill files (`.claude/skills/`), not project-specific documentation:

1. Agent execution contract → reusable skill (agent-execution/SKILL.md)
2. Specification page templates → project docs (_templates/ + spec pages)
3. Task claiming protocol → MCP tools + UI (reusable by any project)
4. update_epic MCP tool → code (reusable by any project)
5. update_task MCP tool → code (reusable by any project)
