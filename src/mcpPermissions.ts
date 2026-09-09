import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";

/**
 * The Agent SDK emits this process warning (via process.emitWarning, confirmed by
 * grepping the installed package) whenever canUseTool is combined with a non-empty
 * allowedTools/tools list, to flag that the bare entries in that list (Read/Write/Glob/
 * WebFetch/WebSearch, typically) get auto-approved before canUseTool is ever consulted.
 * That's expected and intentional for every caller of allowAnyMcpTool below (they all
 * pair it with exactly that setup), so suppressing it here, once, covers every case
 * rather than repeating a warning filter per call site. A plain "warning" event listener
 * doesn't suppress Node's own default console output (confirmed empirically: Node prints
 * the warning regardless of registered listeners), so this patches emitWarning itself
 * instead, letting every other warning (e.g. a real deprecation notice) through
 * unchanged.
 */
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, options?: unknown, ...rest: unknown[]) => {
  const code = typeof options === "object" && options !== null ? (options as { code?: string }).code : undefined;
  if (code === "CLAUDE_SDK_CAN_USE_TOOL_SHADOWED") return;
  (originalEmitWarning as (...args: unknown[]) => void)(warning, options, ...rest);
}) as typeof process.emitWarning;

/**
 * Approves any MCP tool call ("mcp__<server>__<tool>"), regardless of which server it
 * comes from, and denies everything else. This is what lets a project's own .mcp.json
 * declare arbitrary additional MCP servers without the host agent's code needing to know
 * their names ahead of time: a fixed allowedTools wildcard like "mcp__playwright__*" only
 * matches that one named server — confirmed empirically that a bare "mcp__*" entry does
 * NOT match "mcp__<server>__<tool>" the way a real per-server wildcard does — so a
 * dynamic decision here is the only way to cover every MCP server generically.
 *
 * Dropping a .mcp.json inside a project is itself the user's opt-in (the same trust model
 * already used for a custom skill dropped into .claude/skills/ — no separate confirmation
 * step there either), so this approves silently rather than prompting. `disallowedTools`
 * still takes full precedence over this — confirmed empirically that a disallowed tool
 * never even reaches this callback, let alone executes.
 *
 * Every non-MCP tool the agent can use (Read/Write/Glob/WebFetch/WebSearch, ...) is
 * normally granted via the `tools`/`allowedTools` arrays passed to `query()`, which
 * pre-approves them before this callback would ever be consulted — so the "deny"
 * fallback below is a defensive default for anything unexpected, not something normal
 * operation should ever hit.
 */
export const allowAnyMcpTool: CanUseTool = async (toolName, input) => {
  if (toolName.startsWith("mcp__")) {
    return { behavior: "allow", updatedInput: input };
  }
  return { behavior: "deny", message: `"${toolName}" isn't an allowed tool in this session.` };
};
