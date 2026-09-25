/**
 * Turns a raw tool name + input into a short, readable console description, instead of
 * the tool's technical name (e.g. "mcp__playwright__browser_click"). Covers the tools
 * this kit itself provides (Read/Write/Edit/Glob/Grep/Bash/Agent/WebFetch/WebSearch/Skill,
 * plus its own human-approval/manual-intervention/save-to-knowledge/sources MCP tools)
 * generically; a
 * concrete agent supplies a `describe` callback for its own domain-specific tools (e.g.
 * moodle-agent's Playwright browser_* cases) via `createFriendlyToolLabel()`.
 */

export function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// Unlike truncate() above (which cuts the tail off long freeform text), a path's most
// useful part — the filename — is at the *end*, so this keeps the tail and cuts the
// front instead.
export function truncatePath(text: string, max = 60): string {
  return text.length > max ? `…${text.slice(text.length - max + 1)}` : text;
}

/** Returns undefined for anything it doesn't specifically recognize — the caller decides the fallback. */
function describeCore(shortName: string, input: Record<string, unknown>): string | undefined {
  switch (shortName) {
    case "request_human_approval": {
      const summary = typeof input.summary === "string" ? input.summary : "";
      return `Asking for human approval: ${truncate(summary, 120)}`;
    }
    case "request_manual_login":
      return "Waiting for a human to intervene manually";
    case "save_to_knowledge": {
      const destination = typeof input.destination === "string" ? input.destination : "knowledge/";
      return `Saving a file to knowledge/${truncatePath(destination, 70)}`;
    }
    case "save_to_sources": {
      const destination = typeof input.destination === "string" ? input.destination : "";
      return `Saving a file to sources/${truncatePath(destination, 70)}`;
    }
    case "Read": {
      const file = typeof input.file_path === "string" ? input.file_path : "a file";
      return `Reading ${truncatePath(file, 80)}`;
    }
    case "Write": {
      const file = typeof input.file_path === "string" ? input.file_path : "a file";
      return `Writing to ${truncatePath(file, 80)}`;
    }
    case "Edit": {
      const file = typeof input.file_path === "string" ? input.file_path : "a file";
      return `Editing ${truncatePath(file, 80)}`;
    }
    case "Glob": {
      const pattern = typeof input.pattern === "string" ? input.pattern : "*";
      return `Searching for files matching "${truncate(pattern, 60)}"`;
    }
    case "Grep": {
      const pattern = typeof input.pattern === "string" ? input.pattern : "";
      return `Searching file contents for "${truncate(pattern, 60)}"`;
    }
    case "Bash": {
      const command = typeof input.command === "string" ? input.command : "";
      return `Running "${truncate(command, 80)}"`;
    }
    // The SDK's built-in subagent-delegation tool. Confirmed empirically (real
    // transcript) its input is { description, prompt, subagent_type }, not
    // { subagent_type, task } as its own tool description might suggest.
    case "Agent": {
      const subagentType = typeof input.subagent_type === "string" ? input.subagent_type : "a subagent";
      const description = typeof input.description === "string" ? input.description : "";
      return description
        ? `Delegating to "${subagentType}": ${truncate(description, 80)}`
        : `Delegating to "${subagentType}"`;
    }
    case "WebFetch": {
      const url = typeof input.url === "string" ? input.url : "a page";
      return `Fetching ${truncate(url, 80)}`;
    }
    case "WebSearch": {
      const query = typeof input.query === "string" ? input.query : "";
      return `Searching the web for "${truncate(query, 80)}"`;
    }
    // The SDK's own tool for invoking a skill (see session.ts for why it's listed
    // explicitly in `tools`). Confirmed empirically: its input is `{ skill: "name" }`.
    case "Skill": {
      const skill = typeof input.skill === "string" ? input.skill : "a skill";
      return `Applying the "${skill}" skill`;
    }
    default:
      return undefined;
  }
}

export type ToolDescriber = (shortName: string, input: Record<string, unknown>) => string | undefined;

/**
 * Builds a `friendlyToolLabel(toolName, toolInput)` — `describe` lets the host agent
 * layer its own domain-specific cases (e.g. Playwright's browser_* tools) on top of this
 * kit's generic ones; `extraLocalServers` names any *additional* MCP server (beyond this
 * kit's own "approvals"/"manualLogin"/"knowledgeFiles") whose tools should be unwrapped
 * without a "[server] " prefix, e.g. moodle-agent's "playwright".
 */
export function createFriendlyToolLabel(options: { describe?: ToolDescriber; extraLocalServers?: readonly string[] } = {}): (toolName: string, toolInput: unknown) => string {
  const localServers = new Set(["approvals", "manualLogin", "knowledgeFiles", ...(options.extraLocalServers ?? [])]);

  const describe = (shortName: string, input: Record<string, unknown>): string =>
    options.describe?.(shortName, input) ?? describeCore(shortName, input) ?? shortName.replace(/^browser_/, "").replace(/_/g, " ");

  return (toolName: string, toolInput: unknown): string => {
    const input = toolInput && typeof toolInput === "object" ? (toolInput as Record<string, unknown>) : {};
    if (!toolName.startsWith("mcp__")) return describe(toolName, input);

    // MCP tool names are "mcp__<server>__<tool>" — split on the first literal "__" after
    // the prefix rather than on every single "_", since both the server name and the
    // tool name can themselves contain single underscores (e.g. "browser_click").
    const rest = toolName.slice("mcp__".length);
    const separatorIndex = rest.indexOf("__");
    if (separatorIndex === -1) return describe(rest, input);

    const serverName = rest.slice(0, separatorIndex);
    const shortName = rest.slice(separatorIndex + 2);
    if (localServers.has(serverName)) return describe(shortName, input);

    // describe() never has a specific case for a custom server's tools, so this is
    // always its default-case cleanup — prefix it with the server name so the console
    // still says where it came from, e.g. "[podman] container list".
    return `[${serverName}] ${describe(shortName, input)}`;
  };
}
