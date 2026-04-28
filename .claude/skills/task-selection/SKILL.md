---
name: task-selection
description: Defines how an agent selects the most relevant ready task from backlog, sprint, and documentation context. Priority criteria: blocked deps first, claimed tasks excluded, highest-value ready tasks prioritized.
---

# Task Selection Workflow

Use this skill when you need to choose the next task to work on in a Fabriqueta-managed sprint.

## Pre-Check

Before selecting a task, verify:
1. **Skills loaded** — session-init and soul have completed their scan.
2. **Sprint read** — You have the active sprint board loaded via `fabriqueta://projects/{slug}/sprint` or via the `get_project_board` tool.
3. **Current state known** — You know which tasks are in progress, done, or blocked.

## Selection Criteria

Evaluate available tasks (sprint tasks first, then backlog) using these criteria in order:

### 1. Blocked Dependencies First
- If any task is blocked waiting for another task to complete, check if the blocker is now done.
- If yes, the unblocked task becomes the highest priority.

### 2. Claimed Tasks Excluded
- Skip any task where `claimedBy` is set to a different agent.
- If `claimedBy` matches your agent identifier, you may continue working on it.
- If a task has been `in_progress` for >4 hours with no activity, it becomes available for re-claiming (auto-release heuristic).

### 3. In-Progress Tasks Take Priority
- If you already have a claimed task that is `in_progress`, continue working on it rather than starting something new.

### 4. Sprint Tasks Before Backlog Tasks
- Sprint tasks are higher priority than backlog tasks because they represent committed scope.
- Among sprint tasks, prefer those with status `todo` over those already claimed.

### 5. Highest-Value Ready Tasks Priority
- Among unblocked, unclaimed, ready tasks, prioritize by:
  a. **Business value** — Tasks that unlock other work or directly serve the sprint goal.
  b. **Size** — Prefer smaller, finishable tasks to build momentum.
  c. **Dependencies** — Tasks that unblock others come first.
  d. **Risk** — Higher-risk work earlier in the sprint to allow buffer time.

### 6. Documentation and Process Tasks
- If no execution tasks are ready, consider documentation, test, or process improvement tasks.

## Selection Algorithm

```
1. Load the active sprint board
2. Filter to sprint tasks (higher priority than backlog)
3. Remove claimed tasks (claimedBy set to another agent)
4. Group by status: todo > in_progress (your own) > done (skip)
5. Within todo: sort by position (lower = higher priority), then by value estimate
6. Within in_progress (your own): continue existing work
7. If no suitable sprint task: repeat for backlog tasks with same criteria
8. If no suitable backlog task: create a new backlog maintenance task or report idle state
```

## Output

When you select a task, record:
- **Task ID and title**
- **Why it was selected** (e.g., "highest-value ready sprint task", "unblocked by completion of task X")
- **What dependency it serves** (if applicable)

## What Not To Do

- Do not start work on a task claimed by another agent
- Do not bypass the selection criteria because a task looks interesting
- Do not claim more than one task at a time

## Related Skills

- `agent-execution` — Pre-flight, execution loop, and completion contract
- `completion` — Mandatory board/doc update checklist on task completion
- `soul` — Role pull-in and cross-skill discovery
