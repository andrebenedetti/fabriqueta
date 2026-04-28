# Cursor Setup

Cursor has native MCP support and reads configuration from `mcp.json`.

## Project-local configuration

From the Fabriqueta repository root, a local stdio server can be represented with:

```json
{
  "mcpServers": {
    "fabriqueta": {
      "type": "stdio",
      "command": "bun",
      "args": ["apps/mcp-server/src/index.ts"]
    }
  }
}
```

Cursor's MCP docs describe these standard stdio fields:

- `type`
- `command`
- `args`
- optional `env`

## Verification steps

After adding the server:

1. Restart Cursor if needed.
2. Confirm the `fabriqueta` server is recognized.
3. Ask Cursor's agent to list Fabriqueta tools before it edits anything.

## Recommended workflow

- Start each session by reading the current board or documentation.
- Prefer MCP writes for task and documentation updates instead of ad hoc local edits to the database.
- Keep the Fabriqueta project root open so the `apps/mcp-server/src/index.ts` path resolves consistently.

## References

- Cursor MCP docs: https://docs.cursor.com/cli/mcp
- Cursor MCP configuration docs: https://docs.cursor.com/context/mcp
