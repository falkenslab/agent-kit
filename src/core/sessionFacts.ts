import type { McpServerStatus, Options, SlashCommand } from "@anthropic-ai/claude-agent-sdk";
import type { AgentIdentity, Mode } from "./agentSpec.js";
import type { DescribedCapability } from "./extensions.js";
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
    /** Each with its capabilities (#62), in English: what the model reads. */
    active: { name: string; description: string; provides: string[]; capabilities: DescribedCapability[]; unavailable: (DescribedCapability & { reason: string })[]; tools: string[]; help: string[] }[];
    inactive: { name: string; reason: string }[];
    /** The claude.ai connectors let in (#70), and the ones asked for that the account hasn't. */
    connectors?: { allowed: string[]; missing: string[] };
    /** The project's `.mcp.json` servers left out because an extension's duplicates them (#83). */
    projectServers?: ProjectServersLeftOut;
    /** The running extensions waiting for the person to sign in to a remote server (#82): `/extensions sign-in <name>`. */
    needSignIn?: string[];
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
  /** Restarts one of its MCP servers: an installed extension's, when its options change (#55). */
  reconnectMcpServer?: (server: string) => Promise<void>;
  /** Its MCP servers as they are now: their tools and what each says of itself (plan mode's read-only hints). */
  mcpServerStatus?: () => Promise<McpServerStatus[]>;
  /**
   * Signing in to a remote server behind OAuth (#61): the SDK's `Query` has these, undocumented
   * (in `sdk.mjs`, not in `sdk.d.ts`; confirmed empirically, SDK 0.3.300). Attached only when they
   * exist, so a session whose SDK lacks them just can't sign in.
   */
  mcpAuthenticate?: (server: string) => Promise<McpAuthentication>;
  mcpSubmitOAuthCallbackUrl?: (server: string, callbackUrl: string) => Promise<unknown>;
  mcpClearAuth?: (server: string) => Promise<unknown>;
}

/** What starting a remote server's sign-in gives (the SDK's `mcpAuthenticate()`): the link for the person, and whether the CLI waits for its localhost callback. */
export interface McpAuthentication {
  authUrl?: string;
  requiresUserAction?: boolean;
  callbackExpected?: boolean;
}

/** The facts known when the options are built: everything but the mode and what only the running session knows. */
export type StaticSessionFacts = Omit<SessionFacts, "mode" | "switchableModes" | "tools" | "commands" | "context" | "extensions"> & {
  extensions: {
    active: (Omit<SessionFacts["extensions"]["active"][number], "tools"> & { servers: string[] })[];
    inactive: SessionFacts["extensions"]["inactive"];
    connectors?: SessionFacts["extensions"]["connectors"];
    projectServers?: ProjectServersLeftOut;
  };
};

/** The project's `.mcp.json` servers a session leaves out because an extension's duplicates them (#83). */
export interface ProjectServersLeftOut {
  /** The project's `.mcp.json`. */
  file: string;
  /** Those an installed extension's server duplicates: its name there, what it is (a URL, an npm package), and the extension used instead. */
  duplicates: { server: string; target: string; extension: string }[];
}

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
      const [commands, context, statuses] = await Promise.all([
        live.supportedCommands ? within(live.supportedCommands(), [] as SlashCommand[]) : Promise.resolve([] as SlashCommand[]),
        live.contextUsage ? within(live.contextUsage(), null) : Promise.resolve(null),
        live.mcpServerStatus ? within(live.mcpServerStatus(), [] as McpServerStatus[]) : Promise.resolve([] as McpServerStatus[]),
      ]);
      // Those whose remote server waits for the person to sign in (#82).
      const waiting = new Set(statuses.filter((server) => server.status === "needs-auth").map((server) => server.name));
      const needSignIn = base.extensions.active.filter(({ servers }) => servers.some((server) => waiting.has(server))).map(({ name }) => name);
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
          ...(base.extensions.connectors ? { connectors: base.extensions.connectors } : {}),
          ...(base.extensions.projectServers ? { projectServers: base.extensions.projectServers } : {}),
          ...(needSignIn.length ? { needSignIn } : {}),
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
