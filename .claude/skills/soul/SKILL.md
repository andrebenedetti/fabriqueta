---
name: soul
description: Discovers and loads sibling skills by scanning .claude/skills/*/SKILL.md frontmatter. Ensures all relevant roles (PM, Design, Engineering, QA, Docs) are pulled into tasks appropriately.
---

# Soul — Cross-Skill Discovery & Role Pull-In Gateway

Soul has two responsibilities:
1. **Cross-skill discovery** — Enumerate all sibling skills, read their frontmatter, and load any that match the current task.
2. **Role pull-in** — For each product role, decide whether it is needed and simulate that role's perspective.

## Cross-Skill Discovery

Before loading any other context, scan all available `.claude/skills/*/SKILL.md` files:

1. **Enumerate** — List all directories under `.claude/skills/`.
2. **Read frontmatter** — For each `SKILL.md` file, read its frontmatter (name, description).
3. **Match** — Compare each skill's `name` and `description` against:
   - The current task title and description (from the Fabriqueta board)
   - The active sprint goal
   - The user's prompt or request
   - The current project context
4. **Load all matches** — Load every skill whose frontmatter matches. Do not restrict to one.

### Matching Heuristics

- Load a skill if its `name` appears in the task title or description.
- Load a skill if its `description` shares keywords with the task.
- When in doubt, load more skills rather than fewer. Extra skills are additive context, not conflicting instructions.
- Never skip the `session-init` skill if it exists — it must run first.

### Fallback

If no skills match, load `soul` itself as the minimum. Soul alone still provides the role pull-in rules below.

## Mandatory Role Pull-In Rule

For each role below, inspect the task and decide one of:
- Required
- Helpful
- Not needed

### Roles

- Product Manager
- Scrum Master
- Designer
- Backend Engineer
- Frontend Engineer
- QA/Automated Tester
- Documentation Owner

### Decision Guidance

- **Implementation task** → Engineering + QA required, PM helpful
- **UI/UX change** → Design + Frontend required, QA helpful
- **API or data change** → Backend required, Frontend + Docs helpful
- **Sprint or process change** → Scrum Master + PM required
- **Documentation or spec task** → PM + Docs required, Design helpful

### Simulation

Do not wait for a human to represent that role. Simulate the role using the relevant skill and create tasks, notes, acceptance criteria, tests, or documentation as needed.

## Interaction with session-init

If `session-init` was already loaded and ran its pre-flight scan, `soul` acts as a secondary pass — it may discover skills the initial scan missed due to incomplete context. Run the cross-skill discovery pass regardless.

## What Not To Do

- Do not skip cross-skill discovery even if you think you know what skills exist
- Do not load only one skill when multiple are relevant
- Do not substitute role simulation for asking the human when a critical decision is ambiguous

## Related Skills

- `session-init` — Runs first, soul runs as secondary pass
- `engineering`, `design`, `scrum-master`, `qa-testing`, `documentation` — Role-specific skills
