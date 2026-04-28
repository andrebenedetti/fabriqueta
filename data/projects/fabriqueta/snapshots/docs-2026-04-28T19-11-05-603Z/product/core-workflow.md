# Core Workflow

This page describes the current operating model for a single Fabriqueta project.

## Core Entities

### Project

A project is the top-level workspace. It owns one SQLite database and contains backlog data, sprint data, and documentation.

### Epic

An epic groups related tasks in the backlog and can be reordered relative to other epics.

### Task

A task belongs to exactly one epic. Tasks are ordered within their epic. A task may also be assigned to the active sprint.

### Sprint

A sprint represents the currently active execution window. The current implementation supports one active sprint at a time.

### Documentation Node

A documentation node is either:

- a directory used for organization
- a markdown page used for product specifications or operational notes

## Planning Flow

1. Create a project.
2. Create epics in the backlog.
3. Create tasks under those epics.
4. Reorder epics and tasks as priorities change.
5. Start a sprint when a set of work is ready.
6. Add selected tasks to the active sprint.

## Execution Flow

1. Open the board view.
2. Review tasks in the active sprint.
3. Move tasks between `to-do`, `in progress`, and `done`.
4. Complete the sprint when the sprint work is finished.

## Documentation Flow

1. Organize product knowledge into directories.
2. Write markdown pages for specs, flows, architecture notes, and operational instructions.
3. Keep docs updated as product decisions or implementations change.

## Current Constraints

- Every task belongs to exactly one epic.
- Task ordering is scoped within an epic.
- Only one active sprint is supported at a time.
- Documentation currently lives inside the project database, not the filesystem.

## Why This Model Matters

The key design idea is that planning, execution, and specification should not drift apart. A user or agent should be able to move from a task to the relevant product context without switching systems.
