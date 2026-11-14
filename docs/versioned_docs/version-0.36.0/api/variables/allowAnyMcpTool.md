# Variable: allowAnyMcpTool

```ts
const allowAnyMcpTool: CanUseTool;
```

Defined in: [core/mcpPermissions.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/mcpPermissions.ts#L44)

Approves any MCP tool call ("mcp__<server>__<tool>"), regardless of which server it
comes from, and denies everything else. This is what lets a project's own .mcp.json
declare arbitrary additional MCP servers without the host agent's code needing to know
their names ahead of time: a fixed allowedTools wildcard like "mcp__playwright__*" only
matches that one named server — confirmed empirically that a bare "mcp__*" entry does
NOT match "mcp__<server>__<tool>" the way a real per-server wildcard does — so a
dynamic decision here is the only way to cover every MCP server generically.

Dropping a .mcp.json inside a project is itself the user's opt-in (the same trust model
already used for a custom skill dropped into .claude/skills/ — no separate confirmation
step there either), so this approves silently rather than prompting. `disallowedTools`
still takes full precedence over this — confirmed empirically that a disallowed tool
never even reaches this callback, let alone executes.

Every non-MCP tool the agent can use (Read/Write/Glob/WebFetch/WebSearch, ...) is
normally granted via the `tools`/`allowedTools` arrays passed to `query()`, which
pre-approves them before this callback would ever be consulted — so the "deny"
fallback below is a defensive default for anything unexpected, not something normal
operation should ever hit.
