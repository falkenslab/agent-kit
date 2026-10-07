import { t, type ToolPhrase } from "./messages/index.js";

/**
 * Turns a raw tool name + input into a short, readable console description, instead of
 * the tool's technical name (e.g. "mcp__playwright__browser_click"). Covers the tools
 * this kit itself provides (Read/Write/Edit/Glob/Grep/Bash/Agent/WebFetch/WebSearch/Skill,
 * plus its own human-approval/manual-intervention/clock MCP tools) generically; an extension
 * brings its tools' labels with its contribution (`ToolLabels`, ADR-025), and a concrete agent
 * supplies a `describe` callback for its own domain-specific tools (e.g. Playwright's
 * browser_* cases) via `createFriendlyToolLabel()`. The kit's own labels are in the current
 * language (see messages/).
 */

/** Cuts `text` to `max` characters, with "…" at the end. */
export function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Cuts a path to `max` characters from the front, with "…": unlike `truncate()` (which cuts
 * the tail off long freeform text), a path's most useful part, the file name, is at the end.
 */
export function truncatePath(text: string, max = 60): string {
  return text.length > max ? `…${text.slice(text.length - max + 1)}` : text;
}

/** Returns undefined for anything it doesn't specifically recognize — the caller decides the fallback. */
function describeCore(shortName: string, input: Record<string, unknown>): string | undefined {
  const labels = t().labels;
  const text = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);
  switch (shortName) {
    case "request_human_approval":
      return labels.askingApproval(truncate(text(input.summary, ""), 120));
    case "ask_human":
      return labels.askingHuman(truncate(text(input.question, ""), 100));
    case "present_plan":
      return labels.presentingPlan;
    case "request_manual_login":
      return labels.waitingManual;
    case "current_time":
      return labels.checkingTime;
    case "date_math":
      return labels.calculatingDates;
    case "Read":
      return labels.reading(truncatePath(text(input.file_path, labels.aFile), 80));
    case "Write":
      return labels.writing(truncatePath(text(input.file_path, labels.aFile), 80));
    case "Edit":
      return labels.editing(truncatePath(text(input.file_path, labels.aFile), 80));
    case "Glob":
      return labels.findingFiles(truncate(text(input.pattern, "*"), 60));
    case "Grep":
      return labels.searchingContents(truncate(text(input.pattern, ""), 60));
    case "Bash":
      return labels.running(truncate(text(input.command, ""), 80));
    // The SDK's built-in subagent-delegation tool. Confirmed empirically (real
    // transcript) its input is { description, prompt, subagent_type }, not
    // { subagent_type, task } as its own tool description might suggest.
    case "Agent": {
      const subagentType = text(input.subagent_type, labels.aSubagent);
      const description = text(input.description, "");
      return description ? labels.delegatingTask(subagentType, truncate(description, 80)) : labels.delegating(subagentType);
    }
    case "WebFetch":
      return labels.fetching(truncate(text(input.url, labels.aPage), 80));
    case "WebSearch":
      return labels.searchingWeb(truncate(text(input.query, ""), 80));
    // The SDK's own tool for invoking a skill (see session.ts for why it's listed
    // explicitly in `tools`). Confirmed empirically: its input is `{ skill: "name" }`.
    case "Skill":
      return labels.applyingSkill(text(input.skill, labels.aSkill));
    case "TodoWrite":
      return labels.updatingTasks;
    default:
      return undefined;
  }
}

/** How the chat shows one tool: an extension's, by its full name (`ExtensionContribution.toolLabels`). */
export interface ToolLabel {
  /** Its line in the chat, from its input, in the kit's language: "Reading concept/llm-wiki". */
  label(input: Record<string, unknown>): string;
  /** How it counts in a folded group's summary, `[one, many]` with `{n}`: `["read {n} page", "read {n} pages"]`. */
  phrase?: ToolPhrase;
}

/** Tools' labels by full name (`mcp__<server>__<tool>`): what the extensions of a session bring. */
export type ToolLabels = Readonly<Record<string, ToolLabel>>;

/**
 * A `formatAction` that shows the tools in `labels()` with their label, and any other with
 * `formatAction` (the kit's by default). `labels` is read on every call, so it can follow the
 * session in use (`/resume` opens another).
 */
export function withToolLabels(
  labels: () => ToolLabels | undefined,
  formatAction: (toolName: string, toolInput: unknown) => string = createFriendlyToolLabel(),
): (toolName: string, toolInput: unknown) => string {
  return (toolName, toolInput) => {
    const own = labels()?.[toolName];
    if (!own) return formatAction(toolName, toolInput);
    return own.label(toolInput && typeof toolInput === "object" ? (toolInput as Record<string, unknown>) : {});
  };
}

/** A `toolPhrase` that counts the tools in `labels()` with their phrase, and any other with `toolPhrase`. */
export function withToolPhrases(
  labels: () => ToolLabels | undefined,
  toolPhrase?: (toolName: string) => ToolPhrase | undefined,
): (toolName: string) => ToolPhrase | undefined {
  return (toolName) => labels()?.[toolName]?.phrase ?? toolPhrase?.(toolName);
}

/** An agent's labels for its own tools: the tool's short name and input, to a label, or `undefined` for the kit's default. */
export type ToolDescriber = (shortName: string, input: Record<string, unknown>) => string | undefined;

/**
 * Builds a `friendlyToolLabel(toolName, toolInput)` — `describe` lets the host agent
 * layer its own domain-specific cases (e.g. Playwright's browser_* tools) on top of this
 * kit's generic ones; `extraLocalServers` names any *additional* MCP server (beyond this
 * kit's own "approvals"/"manualLogin"/"time") whose tools should be unwrapped
 * without a "[server] " prefix, e.g. "playwright".
 */
export function createFriendlyToolLabel(options: { describe?: ToolDescriber; extraLocalServers?: readonly string[] } = {}): (toolName: string, toolInput: unknown) => string {
  const localServers = new Set(["approvals", "manualLogin", "time", ...(options.extraLocalServers ?? [])]);

  const describe = (shortName: string, input: Record<string, unknown>): string =>
    options.describe?.(shortName, input) ?? describeCore(shortName, input) ?? shortName.replace(/_/g, " ");

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
