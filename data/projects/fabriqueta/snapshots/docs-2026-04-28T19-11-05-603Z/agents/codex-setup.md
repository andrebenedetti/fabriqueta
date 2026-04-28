# Codex Setup

This guide explains how to connect Fabriqueta to Codex through MCP.

## What the integration should provide

Codex should be able to:

- read the Fabriqueta backlog and active sprint
- read and update product documentation
- move tasks as work progresses

## Local server entrypoint

From the Fabriqueta repository root, the MCP server entrypoint is:

`bun apps/mcp-server/src/index.ts`

This starts the local stdio MCP server that exposes Fabriqueta tools and resources.

## Recommended setup

OpenAI's MCP docs state that Codex can connect to MCP servers in the CLI or IDE extension and that this configuration is shared between both surfaces. For Fabriqueta, the important values are:

- server name: `fabriqueta`
- transport: local stdio
- command: `bun`
- args: `apps/mcp-server/src/index.ts`

## Verification steps

After adding the server to Codex:

1. Run `codex mcp list` and confirm that `fabriqueta` appears.
2. Ask Codex to list the available Fabriqueta tools.
3. Ask Codex to read the current project board before making any changes.

## Usage guidance

- Start with read operations before allowing write operations.
- Ask Codex to explain which Fabriqueta tool it plans to use when a task is high-impact.
- Prefer letting Codex update Fabriqueta through MCP instead of editing SQLite files directly.

## Notes

The exact Codex add-server UX may evolve, but the integration always centers on the same local command and arguments listed above.

## References

- OpenAI MCP docs: https://platform.openai.com/docs/docs-mcp
