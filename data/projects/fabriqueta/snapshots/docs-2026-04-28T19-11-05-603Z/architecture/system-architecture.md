# System Architecture

Fabriqueta is built as a local-first TypeScript application with a shared project model across the UI, backend, and AI agent interface.

## Stack

- Backend: Bun + TypeScript
- Database: SQLite
- Frontend: React + TanStack Router
- Agent interface: MCP server over stdio

## Storage Model

Each project is represented by its own SQLite file. This is a deliberate product decision. It keeps project state portable, isolated, and easy to reason about.

A project database currently stores:

- project metadata
- epics
- tasks
- sprints
- documentation nodes

## Application Layers

### Backend API

The Bun server exposes HTTP endpoints used by the frontend. These endpoints read and mutate project state inside the selected project database.

### Frontend

The React app provides three main views inside a project:

- Backlog
- Board
- Documentation

### MCP Server

The MCP server exposes the same project model to AI agents. This lets agents inspect backlog state, sprint state, and documentation, then update those artifacts as work progresses.

## Documentation Representation

Documentation is stored as a tree of nodes in SQLite. Each node is either a directory or a page. Pages store markdown content directly in the database.

This allows:

- nested organization
- empty directories when useful
- agent-readable structured access
- project portability without external files

## Design Tradeoffs

### Benefits

- one self-contained artifact per project
- simple local setup
- consistent access model for UI and agents
- easy project isolation

### Tradeoffs

- documentation is not edited as filesystem markdown today
- large rich-media documentation is not yet a focus
- collaboration is currently optimized for local use, not multi-user deployment

## Architectural Intent

Fabriqueta should act as a small operating system for product work, where the same source of truth powers human workflows and AI-assisted execution.
