---
name: agent-execution
description: Use this skill when executing a task within a Fabriqueta project. It defines the mandatory pre-flight, execution loop, and completion contract that every agent must follow.
---

# Agent Execution Contract

Use this skill when executing a task within a Fabriqueta project. This is the canonical operating procedure for any agent working on a Fabriqueta-managed sprint.

## Pre-Flight Checklist

Before executing any task, you must:

1. **Read the active sprint** — Load `fabriqueta://projects/{slug}/sprint` to understand what's in play.
2. **Read the task context** — Load the specific task via `get_task_context` MCP tool. Understand its epic, description, and linked docs.
3. **Claim the task** — Use the `claim_task` MCP tool with your agent identifier to signal "I'm working on this." This prevents duplicate work by other agents.
4. **Read linked documentation** — If the task references doc pages, read them via `fabriqueta://projects/{slug}/documentation/nodes/{nodeId}`.
5. **Check blocking dependencies** — If the task depends on another task, verify the dependency is done before starting.

## Execution Loop

While working on the task:

1. **Update status to in_progress** — Use `update_task_status` (or `update_task`) as soon as you begin active work.
2. **Keep the task description current** — If you discover new scope, constraints, or decisions, update the task description via `update_task` so the next agent or human has full context.
3. **Refresh linked documentation** — If your implementation changes product behavior, update the relevant doc pages via `update_documentation_node`.
4. **Create subtasks if needed** — If the task is too large, create follow-up tasks under the same epic via `create_task`.
5. **Report blockers immediately** — If you cannot proceed, set status back to "todo", release the task, and document the blocker in the task description.

## Completion

When the task is finished:

1. **Mark the task as done** — Use `update_task_status` (or `update_task`) to set status to "done".
2. **Release the task** — Use `release_task` so other agents know the task is available (already done, but also releases the claim).
3. **Update documentation** — Ensure any product specs affected by your work are current.
4. **Write a task completion note** — Update the task description with a brief summary of what was done, any decisions made, and any follow-up items.
5. **Review the sprint board** — Check if any other tasks are unblocked by your completion and should be started next.
6. **Select the next task** — Use `get_project_board` to find the next highest-priority ready task.

## What Not To Do

- Do not start work on an unclaimed task.
- Do not claim more than one task at a time.
- Do not mark a task done without updating linked documentation.
- Do not delete epics, tasks, or documentation without human approval (see approval-checkpoints skill).
