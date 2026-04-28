---
name: completion
description: Mandatory completion checklist. Defines what an agent must leave behind when completing any task: updated task status, refreshed documentation, linked docs, retro note.
---

# Completion Checklist — Mandatory Task Completion Contract

This skill defines what must be true when you mark a task as done. Every step is mandatory — do not skip any.

## Pre-Completion Checklist

Before marking a task `done`, verify all of the following:

### 1. Task Status Updated
- [ ] Task status is set to `done` via `update_task_status` or `update_task`
- [ ] The task description reflects what was actually done (decisions, scope changes, known limitations)

### 2. Documentation Refreshed
- [ ] All product specs affected by this task are updated in the Fabriqueta documentation tree
- [ ] Spec pages reflect the current behavior, not the intended behavior before implementation
- [ ] If a spec page was created during this task, it is linked to the task (via the task description or doc_links field)

### 3. Linked Documentation (if applicable)
- [ ] If the task references specific doc pages, verify those pages are still accurate
- [ ] If the implementation changed the spec, update the spec page content
- [ ] If implementation scope was narrower than spec, note the gap in both the task description and the spec

### 4. Sprint Board Reviewed
- [ ] Review the active sprint board after completion
- [ ] Check if any other tasks are unblocked by this completion
- [ ] If a task was unblocked, note it for the next task selection pass

### 5. Task Released
- [ ] Call `release_task` so the task is available for other agents to inspect or re-claim

### 6. Completion Summary Written
- [ ] Update the task description with a brief completion summary including:
  - What was implemented or changed
  - Key decisions made during execution
  - Any uncovered work or follow-up items
  - Links to updated documentation pages

## Completion Summary Template

```
## Completion Summary

**What was done:**
<brief description of implementation>

**Key decisions:**
- <decision 1>
- <decision 2>

**Follow-up items:**
- <item 1>
- <item 2>

**Updated docs:**
- <doc page path> — <what changed>
```

## What Not To Do

- Do not mark a task done without updating affected documentation
- Do not skip the sprint board review — another task may be unblocked
- Do not leave a claimed task when it is done — always release
- Do not skip the completion summary — the next agent or human needs context

## Post-Completion

After completing all checklist items:

1. Run the next task selection workflow (see `task-selection` skill) to choose the next task.
2. If no work is available, report the current state: "Sprint X tasks: Y done, Z remaining, W blocked."

## Related Skills

- `agent-execution` — Pre-flight, execution loop, and completion contract (this is the completion step)
- `task-selection` — Next-task selection after completing
- `soul` — Role pull-in for reviewing documentation updates
