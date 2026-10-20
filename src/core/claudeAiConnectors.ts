import { query, type Options, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

/**
 * The claude.ai connectors an agent lets in (#70): the person's account's integrations (Canva,
 * Notion…), which the kit keeps out by default (`disableClaudeAiConnectors`, ADR-018). The SDK
 * lets them in all or none, and lets one out only by its name (`deniedMcpServers`); an allowlist
 * would have to list every other server of the session exactly (confirmed empirically, CLI
 * 2.1.300). So the kit asks the account which it has, when the session opens, and denies by name
 * the ones the agent didn't choose; a gate blocks a call to any other (one added since).
 *
 * `toggleMcpServer()` is never used for them: it saves the switch in the person's own Claude Code
 * config for the folder (`~/.claude.json`, `disabledMcpServers`), not only in the session
 * (confirmed empirically, CLI 2.1.300).
 */

/** The name the SDK gives a claude.ai connector's server: `claude.ai <Name>`. */
export const CONNECTOR_PREFIX = "claude.ai ";

/** The prefix of a server's tools as the model names them: `claude.ai Claude Docs` → `mcp__claude_ai_Claude_Docs__`. */
export function serverToolPrefix(server: string): string {
  return `mcp__${server.replace(/[^A-Za-z0-9_-]/g, "_")}__`;
}

/** Whether a tool is a claude.ai connector's. */
export function isConnectorTool(tool: string): boolean {
  // `claude.ai <Name>` becomes `mcp__claude_ai_<Name>__`: the prefix up to the name.
  return tool.startsWith("mcp__claude_ai_");
}

/** What the agent chose, set against what the account has: the servers to let in, to deny, and the names it asked for that aren't there. */
export interface ConnectorChoice {
  allowed: string[];
  denied: string[];
  missing: string[];
}

/** Chooses among the account's connectors (`found`, as the SDK names them) the ones the agent wants, by the name claude.ai shows (any case). */
export function chooseConnectors(found: readonly string[], wanted: readonly string[]): ConnectorChoice {
  const label = (server: string) => (server.startsWith(CONNECTOR_PREFIX) ? server.slice(CONNECTOR_PREFIX.length) : server).toLowerCase();
  const asked = new Set(wanted.map(label));
  const allowed = found.filter((server) => asked.has(label(server)));
  const present = new Set(allowed.map(label));
  return { allowed, denied: found.filter((server) => !asked.has(label(server))), missing: wanted.filter((name) => !present.has(label(name))) };
}

/**
 * The account's claude.ai connectors, by the names the SDK gives them: a session that sends no
 * message, opened in `cwd` with connectors on, its servers' status read and closed. A few seconds;
 * an empty list when it can't tell (no login, no network), so nothing is let in.
 */
export async function discoverConnectors(cwd: string, options: Pick<Options, "pathToClaudeCodeExecutable" | "env"> & { timeoutMs?: number } = {}): Promise<string[]> {
  let release: () => void = () => {};
  const done = new Promise<void>((resolve) => (release = resolve));
  // A conversation that never sends a message, ended when the look is over: the session only starts its servers.
  const prompt: AsyncIterable<SDKUserMessage> = { [Symbol.asyncIterator]: () => ({ next: () => done.then(() => ({ done: true as const, value: undefined })) }) };
  const session = query({
    prompt,
    options: {
      cwd,
      settingSources: ["project"],
      tools: [],
      settings: { autoMemoryEnabled: false, disableClaudeAiConnectors: false },
      ...(options.pathToClaudeCodeExecutable ? { pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable } : {}),
      ...(options.env ? { env: options.env } : {}),
    },
  });
  void (async () => {
    for await (const message of session) void message;
  })().catch(() => undefined);
  try {
    const connectors = async () => (await session.mcpServerStatus()).filter((server) => server.scope === "claudeai" || server.name.startsWith(CONNECTOR_PREFIX));
    // Connectors come from the account after the session starts: wait until none is pending.
    const deadline = Date.now() + (options.timeoutMs ?? 10_000);
    let found = await connectors().catch(() => []);
    while (Date.now() < deadline && (!found.length || found.some((server) => server.status === "pending"))) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      found = await connectors().catch(() => []);
    }
    return found.map((server) => server.name);
  } catch {
    return [];
  } finally {
    release();
    session.close();
  }
}
