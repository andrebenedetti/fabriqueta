---
name: session-init
description: Mandatory session bootloader. Scans all available .claude/skills/, matches descriptions against the current task, and loads matching skills before any work begins. Any Fabriqueta project can adopt this skill.
---

# Session Init — Mandatory Skill Bootloader

This skill must be the **first** skill loaded in any agent session. It inventories all available skills, matches them against the current task, and activates relevant ones. Do not skip this step.

## Quick Exit (No Task)

If there is no current task, no sprint goal, and no user request or prompt, skip the full scan and immediately load `soul`:

```
Session init: no task or prompt detected, loaded soul as minimum
```

Do not read any skill files. Stop here.

## Pre-Flight Scan (Task Exists)

Only run this section if a task, sprint goal, or user prompt exists.

1. **List all skill directories** — Enumerate all directories under `.claude/skills/`. Each directory with a `SKILL.md` file is a skill.
2. **Read skill frontmatter only** — For each `SKILL.md`, read only the first 5 lines (YAML frontmatter). Extract `name` and `description`. Do not read the full file body.
3. **Match against the current task** — Compare each skill's `name` and `description` against:
   - The current task title and description
   - The active sprint goal
   - The user's request or prompt
4. **Load all matching skills** — Load every skill whose `name` or `description` matches the task at hand. Do not pick only one — load all matches.

## Matching Rules

- A skill **matches** if its `name` or `description` shares significant keywords with the task title, task description, sprint goal, or user prompt.
- If multiple skills match, load **all** of them. Skills are additive — they provide guidelines, not exclusive paths.
- If no skills match the task, load **at minimum** the `soul` skill.
- Do not skip skills that seem generic. The `engineering`, `scrum-master`, and `design` skills are relevant more often than they appear.

## Fallback

If no skills match after the full scan, load `soul` as the minimum. `soul` will then discover and load sibling skills (see the `soul` skill for cross-skill discovery).

## Logging

Record which skills were loaded at the start of the session so there is an audit trail:

```
Session init: loaded [skill-a, skill-b, skill-c] matching task "<task-title>"
```

If fallback was used after a full scan:

```
Session init: no direct matches, loaded soul as minimum
```

If quick exit was used (no task/prompt):

```
Session init: no task or prompt detected, loaded soul as minimum
```

## What Not To Do

- Do not skip the pre-flight scan because "you already know what skills exist"
- Do not load only one skill when multiple match
- Do not proceed with any work before session-init completes

## Related Skills

- `soul` — Cross-skill discovery gateway (loaded as minimum fallback)
- `agent-execution` — Canonical operating procedure after skills are loaded
