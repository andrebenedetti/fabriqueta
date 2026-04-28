# Scope, Non-Goals, and Success Metrics

This page defines what Fabriqueta is trying to become, what it should avoid becoming in the near term, and how progress should be measured.

## Product Vision

Fabriqueta should be a local-first operating system for product work where backlog management, sprint execution, documentation, and AI-agent coordination all live in one coherent project model.

A human or AI agent should be able to move from planning to execution without losing the context needed to make good decisions.

## Primary Users

- solo builders running product delivery with AI assistance
- small product teams that want local-first planning and execution
- operators coordinating multiple AI agents on a codebase

## Core Problems To Solve

1. Product specifications and implementation work drift apart over time.
2. AI agents often execute work without updating the surrounding planning context.
3. Teams lose time moving between documents, task boards, and agent tools.
4. Lightweight local projects often do not have a clean way to expose context to agents safely.

## In Scope

### Project-Centric Work Management

- projects with isolated SQLite databases
- epics, ordered tasks, and sprint planning
- a board view for active sprint execution

### Documentation as First-Class Product State

- markdown pages organized in directories
- editable product specifications stored with the project
- documentation that can be read and updated by both humans and agents

### Agent-Native Operations

- MCP tools and resources for project reads and writes
- workflows where agents keep backlog and docs synchronized with implementation
- support for major agent environments such as Codex, Claude, and Cursor

### Local-First Reliability

- simple local setup
- project portability
- strong automated regression coverage for core flows

## Near-Term Non-Goals

- multi-user cloud collaboration
- complex permissions and enterprise identity
- rich media document authoring
- hosted deployment workflows
- full replacement for large-scale issue trackers like Jira or Linear

## Product Quality Bar

Fabriqueta should feel trustworthy when an AI agent touches it. That means:

- state changes are visible and understandable
- documentation remains current enough to guide future work
- the project model stays portable and easy to recover
- MCP interactions are stable enough for repeated automation

## Success Metrics

### Workflow Effectiveness

- a user can create a project, plan a sprint, execute it, and keep specs updated without leaving the system
- an agent can read context and make project updates without manual database access

### Documentation Quality

- key product decisions and operating context are discoverable inside the documentation tree
- tasks can be completed with minimal ambiguity about the relevant spec context

### Agent Productivity

- major AI agents can connect through MCP with minimal setup friction
- common agent workflows need fewer context tokens over time because project state is well structured

### Reliability

- end-to-end tests catch regressions in board, documentation, and MCP flows
- project data remains isolated and recoverable per SQLite file

## What Good Looks Like

A mature Fabriqueta project should let the next human or agent understand:

- what the product is trying to achieve
- what work is currently in motion
- what documentation defines the current truth
- what changed recently and why
