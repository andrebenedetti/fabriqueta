# Fabriqueta

First working slice of a local product-work operating system built with Bun, TypeScript, SQLite, React, and TanStack Router.

## Included in this step

- Create projects, each stored in its own SQLite file
- Create epics inside a project
- Create tasks inside each epic
- Reorder epics and tasks with move up/down controls

## Run locally

1. Install dependencies:

   ```bash
   bun install
   ```

2. Start the API server:

   ```bash
   bun run dev:server
   ```

3. In another terminal, start the frontend:

   ```bash
   bun run dev:web
   ```

4. Open the frontend URL printed by Vite, usually `http://localhost:5173`.

The Bun API runs on `http://localhost:3001` by default and stores project databases in `data/projects/`.
If that port is busy, start it with `PORT=3101 bun run dev:server` and update the Vite proxy if needed.
