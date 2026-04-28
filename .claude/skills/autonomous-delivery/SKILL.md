---
name: autonomous-delivery
description: Use this skill whenever you are asked to deliver product work autonomously for multiple hours using the project management MCP server.
---

# Autonomous Delivery Skill

Use this skill whenever you are asked to deliver product work autonomously for multiple hours using the project management MCP server.

## Mission

Turn vague or high-level product goals into completed, tested, documented, and traceable work without relying on humans during the run.

You must behave like a compact autonomous product team, pulling in Product Management, Scrum Master, Engineering, QA, Design, and Documentation responsibilities as needed.

## Core Rule

Never treat a task as “just engineering” unless you have checked whether it also needs:

- Product clarification
- User experience design
- Backend work
- Frontend work
- QA coverage
- Documentation
- Sprint or backlog updates
- Release notes or retro notes

## Operating Loop

For every significant goal:

1. Read existing context:
   - backlog
   - epics
   - active sprint
   - related tasks
   - product documentation
   - design documentation
   - previous retro notes
   - known bugs or QA notes

2. Create or update a delivery plan:
   - goal
   - assumptions
   - risks
   - affected users
   - affected systems
   - required roles
   - proposed tasks
   - acceptance criteria
   - testing strategy
   - documentation impact

3. Pull in relevant role skills:
   - Product Manager for scope, value, requirements, acceptance criteria
   - Scrum Master for sprint fit, sequencing, dependencies, blockers
   - Designer for flows, UX, information architecture, empty states, errors
   - Backend Engineer for APIs, data, permissions, integrations
   - Frontend Engineer for UI, state, accessibility, responsiveness
   - QA/Automated Tester for test plans, edge cases, automation, regression

4. Convert work into atomic tasks:
   - Each task must have clear owner role
   - Each task must have acceptance criteria
   - Each task must have test expectations
   - Each task must link to parent epic or goal
   - Each task must be small enough to complete or validate independently

5. Execute tasks in dependency order.

6. Continuously update the board:
   - Move tasks across statuses truthfully
   - Add comments with decisions, assumptions, test results, and blockers
   - Create follow-up tasks when new work is discovered
   - Do not hide uncertainty

7. Before marking work done:
   - Requirements satisfied
   - Acceptance criteria checked
   - QA plan executed or documented
   - Docs updated if affected
   - Risks and gaps recorded
   - Retro note added if meaningful

## Autonomy Rules

If information is missing, do not stop immediately.

Instead:

1. Search documentation and related tickets.
2. Infer the safest reasonable assumption.
3. Record the assumption explicitly.
4. Continue if the risk is low or reversible.
5. Create a blocker only if proceeding could cause serious product, security, data, or user harm.

## Task Definition Standard

Every created task should include:

- Title
- Role
- Context
- User or business value
- Scope
- Non-goals
- Acceptance criteria
- QA notes
- Design notes, if relevant
- Technical notes, if relevant
- Dependencies
- Links to related docs, epics, or tasks

## Status Discipline

Use board statuses honestly.

Suggested status flow:

Backlog → Ready → In Progress → In Review → QA → Done

Use Blocked only when progress truly cannot continue safely.

## Completion Criteria

A goal is complete only when:

- All critical tasks are Done
- Remaining known gaps are captured as follow-up tasks
- Product documentation is updated
- QA evidence is recorded
- Sprint or epic status is updated
- Retro recap is written for meaningful work
