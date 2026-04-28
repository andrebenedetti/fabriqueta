# Claude Setup

This guide covers Claude Code first, because it is the most direct fit for Fabriqueta's local MCP workflow.

## Claude Code

Anthropic's Claude Code docs support local stdio MCP servers with the `claude mcp add` flow.

From the Fabriqueta repository root, add the server as a project-scoped MCP integration:

```bash
claude mcp add fabriqueta --scope project -- bun apps/mcp-server/src/index.ts
```

That creates or updates a shared `.mcp.json` file so the project can advertise the same MCP server to collaborators.

## Verify the connection

```bash
claude mcp list
```

After that:

1. Ask Claude to list MCP servers and confirm `fabriqueta` is available.
2. Ask Claude to read the active sprint before taking action.
3. Ask Claude to update a task only after explaining the intended write.

## Claude Desktop

Anthropic's support docs also describe local MCP support in Claude Desktop through the Extensions and local MCP workflow. If you prefer Claude Desktop instead of Claude Code:

- enable local MCP / extensions support
- register Fabriqueta as a local MCP server
- point it at `bun apps/mcp-server/src/index.ts`

## Operational guidance

- Use project scope for shared team configuration in Claude Code.
- Keep sensitive credentials out of shared MCP config files.
- Review write actions carefully when Claude is about to mutate backlog or documentation state.

## References

- Claude Code MCP docs: https://docs.anthropic.com/en/docs/claude-code/mcp
- Claude Desktop local MCP guide: https://support.anthropic.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
