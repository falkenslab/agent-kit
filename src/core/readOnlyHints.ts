import type { McpServerStatus } from "@anthropic-ai/claude-agent-sdk";

/** What an MCP tool's own server says about it: `readOnlyHint`, `destructiveHint`. */
export type ToolHint = "readOnly" | "destructive";

/**
 * What the MCP servers themselves say about their tools (#53, #76): for an installed extension
 * whose manifest lists no `readOnlyTools` (plan mode, guided mode) or no `confirmTools` (guided
 * mode), a tool its server marks `readOnlyHint` only reads, and one it marks `destructiveHint`
 * always asks.
 *
 * Asked when a gate meets the call, not once at start: a server is `pending` for seconds after
 * the session starts, and one turned off and on again (liveExtensions.ts) may come back with
 * other tools. The SDK's `mcpServerStatus()` gives each connected server's tools with
 * `annotations.readOnly` (and `destructive`), set exactly when the server says the hint is `true`
 * (confirmed empirically for `readOnlyHint`: `false` and no hint both leave it out; the names are
 * the short ones). Anything else — not connected, not asked in time, no hint — is no.
 */
export function createToolHints(servers: readonly string[], status: () => (() => Promise<McpServerStatus[]>) | undefined, hint: ToolHint): (toolName: string) => Promise<boolean> {
  return async (toolName) => {
    const server = servers.find((name) => toolName.startsWith(`mcp__${name}__`));
    const read = status();
    if (!server || !read) return false;
    const tool = toolName.slice(`mcp__${server}__`.length);
    const statuses = await within(read(), []);
    const found = statuses.find((entry) => entry.name === server && entry.status === "connected");
    return found?.tools?.some((entry) => entry.name === tool && entry.annotations?.[hint] === true) ?? false;
  };
}

/** Plan mode's read-only tools from the servers themselves: `createToolHints()` for `readOnlyHint`. */
export function createReadOnlyHints(servers: readonly string[], status: () => (() => Promise<McpServerStatus[]>) | undefined): (toolName: string) => Promise<boolean> {
  return createToolHints(servers, status, "readOnly");
}

// A call to the session made from a hook, before a tool runs: never let it hold the tool up.
const TIMEOUT_MS = 3000;
const within = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
  Promise.race([promise.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), TIMEOUT_MS).unref())]);
