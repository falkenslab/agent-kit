import type { Options, SlashCommand } from "@anthropic-ai/claude-agent-sdk";
import type { AgentIdentity, Mode } from "./agentSpec.js";
import type { Language } from "./language.js";
import type { ModeControl } from "./modeControl.js";
import type { ContextUsage } from "./runner.js";

/**
 * What a session is, at the moment it's asked (`ExtensionContext.session()`, #43): the core's
 * facts, read-only, never another extension's data. The mode follows Shift+Tab and plan mode;
 * the tools, skills, commands and context come from the running session once it has started.
 */
export interface SessionFacts {
  /** Who the agent is (`AgentSpec.identity`). */
  identity?: AgentIdentity;
  /** The agent-kit version it runs on. */
  kitVersion: string;
  /** The kit's language for this session. */
  language: Language;
  /** The mode now, and the ones the person can switch to (Shift+Tab). */
  mode: Mode;
  switchableModes: Mode[];
  /** The extensions running (with their tools and what they say about themselves here), and the ones off, with why. */
  extensions: {
    active: { name: string; description: string; provides: string[]; tools: string[]; help: string[] }[];
    inactive: { name: string; reason: string }[];
  };
  /** The subagents it can delegate to. */
  subagents: { name: string; description: string }[];
  /** Every tool of the session, as the model names it (empty until the session has started). */
  tools: string[];
  /** The skills offered (the running session's list once started; until then, the ones asked for). */
  skills: string[];
  /** The slash commands the person can type, with what each does (empty until the session has started). */
  commands: { name: string; description: string; argumentHint: string }[];
  /** How full the context window is, when the session can tell. */
  context?: ContextUsage;
  /** This run's folder. */
  runDir: string;
}

/** What the running session tells the view: `runQuery()` attaches it on its own. */
export interface SessionLive {
  tools?: string[];
  skills?: string[];
  supportedCommands?: () => Promise<SlashCommand[]>;
  contextUsage?: () => Promise<ContextUsage | null>;
  /** The running session's controls an installed extension is turned off and on with (liveExtensions.ts). */
  toggleMcpServer?: (server: string, enabled: boolean) => Promise<void>;
  reloadPlugins?: () => Promise<unknown>;
}

/** The facts known when the options are built: everything but the mode and what only the running session knows. */
export type StaticSessionFacts = Omit<SessionFacts, "mode" | "switchableModes" | "tools" | "commands" | "context" | "extensions"> & {
  extensions: { active: (Omit<SessionFacts["extensions"]["active"][number], "tools"> & { servers: string[] })[]; inactive: SessionFacts["extensions"]["inactive"] };
};

export interface SessionView {
  facts(): Promise<SessionFacts>;
  attach(live: SessionLive): void;
  /** What the running session has attached so far. */
  controls(): SessionLive;
}

// A live call made from inside a tool, mid-turn: never let it hold the tool up.
const LIVE_TIMEOUT_MS = 3000;
const within = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
  Promise.race([promise.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), LIVE_TIMEOUT_MS).unref())]);

/** The view of a session: its static facts, the mode read from `modeControl` on every call, and what the running session attaches. */
export function createSessionView(base: StaticSessionFacts, modeControl: ModeControl): SessionView {
  let live: SessionLive = {};
  return {
    attach(more) {
      live = { ...live, ...more };
    },
    controls: () => live,
    async facts() {
      const tools = live.tools ?? [];
      const [commands, context] = await Promise.all([
        live.supportedCommands ? within(live.supportedCommands(), [] as SlashCommand[]) : Promise.resolve([] as SlashCommand[]),
        live.contextUsage ? within(live.contextUsage(), null) : Promise.resolve(null),
      ]);
      return {
        ...base,
        mode: modeControl.mode,
        switchableModes: [...modeControl.switchable],
        extensions: {
          active: base.extensions.active.map(({ servers, ...extension }) => ({
            ...extension,
            // The running session's names when it has started; until then, each server's wildcard.
            tools: tools.length ? tools.filter((tool) => servers.some((server) => tool.startsWith(`mcp__${server}__`))) : servers.map((server) => `mcp__${server}__*`),
          })),
          inactive: base.extensions.inactive,
        },
        tools,
        skills: live.skills ?? base.skills,
        commands: commands.map(({ name, description, argumentHint }) => ({ name, description, argumentHint })),
        ...(context ? { context } : {}),
      };
    },
  };
}

// The view rides on the options under a symbol, for runQuery() to attach the running session to
// without the host passing anything: a spread (`{ ...options, more }`) keeps it, the SDK ignores
// it, and options built some other way just leave the live facts out.
const SESSION_VIEW = Symbol.for("agent-kit.sessionView");

/** Ties a view to the options `buildSessionOptions()` returns. */
export function registerSessionView(options: Options, view: SessionView): void {
  Object.defineProperty(options, SESSION_VIEW, { value: view, enumerable: true });
}

/** The view tied to these options (or a spread copy of them), if `buildSessionOptions()` built them. */
export function sessionViewOf(options: Options): SessionView | undefined {
  return (options as Record<symbol, SessionView | undefined>)[SESSION_VIEW];
}
