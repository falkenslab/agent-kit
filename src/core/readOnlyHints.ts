import type { McpServerStatus } from "@anthropic-ai/claude-agent-sdk";

/**
 * Plan mode's read-only tools from the MCP servers themselves (#53): for an installed extension
 * whose manifest lists no `readOnlyTools`, a tool its server marks `readOnlyHint` only reads.
 *
 * Asked when plan mode meets the call, not once at start: a server is `pending` for seconds after
 * the session starts, and one turned off and on again (liveExtensions.ts) may come back with
 * other tools. The SDK's `mcpServerStatus()` gives each connected server's tools with
 * `annotations.readOnly`, set exactly when the server says `readOnlyHint: true` (confirmed
 * empirically: `readOnlyHint: false` and no hint both leave it out; the names are the short ones).
 * Anything else — not connected, not asked in time, no hint — is no: plan mode denies.
 */
export function createReadOnlyHints(servers: readonly string[], status: () => (() => Promise<McpServerStatus[]>) | undefined): (toolName: string) => Promise<boolean> {
  return async (toolName) => {
    const server = servers.find((name) => toolName.startsWith(`mcp__${name}__`));
    const read = status();
    if (!server || !read) return false;
    const tool = toolName.slice(`mcp__${server}__`.length);
    const statuses = await within(read(), []);
    const found = statuses.find((entry) => entry.name === server && entry.status === "connected");
    return found?.tools?.some((entry) => entry.name === tool && entry.annotations?.readOnly === true) ?? false;
  };
}

// A call to the session made from a hook, before a tool runs: never let it hold the tool up.
const TIMEOUT_MS = 3000;
const within = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
  Promise.race([promise.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), TIMEOUT_MS).unref())]);
