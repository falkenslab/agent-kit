import type { AgentDefinition as SdkSubagentDefinition, McpServerConfig, SettingSource } from "@anthropic-ai/claude-agent-sdk";
import type { KnowledgeStore, PageType } from "../extensions/knowledge/knowledgeStore.js";
import type { Extension } from "./extensions.js";

/**
 * The human-supervision spectrum every agent built on this kit shares, independent of
 * domain: "interactive" pauses before every single action, "guided" only pauses before a
 * hard-to-undo/visible-to-others action, "autonomous" has no human-in-the-loop channel at
 * all, and "plan" only reads and plans: nothing is changed until the human leaves it (see
 * hooks/planGate.ts). See session.ts's buildSessionOptions() for exactly what each mode changes.
 *
 * Deliberately orthogonal to whether the session is a one-shot run or a multi-turn chat
 * (that's a matter of which entry point the caller uses — a single `query()` call vs.
 * `runChatTui()`/`createInputQueue()` — not a supervision level): a concrete agent that
 * wants to know "is this session chat-shaped" for its own purposes (e.g. picking a
 * different system-prompt template) should track that as its own domain field on its
 * config type, not conflate it with `Mode`.
 */
export type Mode = "interactive" | "guided" | "autonomous" | "plan";

/**
 * The minimum a config object needs to drive `buildSessionOptions()` — a concrete agent's
 * own config type (e.g. a `Config`) extends this with whatever domain fields
 * it needs (a course URL, credentials, ...), which `buildSessionOptions()` itself never
 * looks at directly: only `AgentSpec`'s methods receive the full concrete config.
 */
export interface BaseSessionConfig {
  mode: Mode;
  /** Project root (the session's cwd): the folder under which the agent's notes, sources and runs live. */
  projectDir: string;
  /**
   * Where the agent writes its own notes (the "wiki"). Setting this or `sourcesDir` is what
   * gives the session the file tools (Read/Write/Edit/Glob/Grep, scoped — see
   * hooks/fileScopeGate.ts); without either, the agent has no file access at all.
   */
  knowledgeDir?: string;
  /**
   * Original files, kept as obtained and apart from the notes in `knowledgeDir`: material
   * the user drops in, plus whatever the agent saves with `save_to_sources` (downloaded
   * documents, transcripts...). The agent can read and search it but never edit it — Write/
   * Edit are scoped to `knowledgeDir` — and `save_to_sources` never overwrites.
   */
  sourcesDir?: string;
  /** Directories besides `knowledgeDir`/`sourcesDir` where Write/Edit are allowed (see hooks/fileScopeGate.ts). */
  extraWritableDirs?: string[];
  /**
   * Directories besides `sourcesDir`/`extraWritableDirs` the agent may read and search (Read,
   * Glob, Grep), never write. Read and Glob reach nothing else on the disk but what the kit
   * knows the agent needs (see hooks/fileScopeGate.ts).
   */
  extraReadableDirs?: string[];
  /** Files or directories the agent must never read, search or write, e.g. a config file holding a password (see hooks/fileScopeGate.ts). */
  deniedPaths?: string[];
  /** Extra values (e.g. a password) to scrub out of the transcript log — see hooks/transcriptLogger.ts. */
  secrets?: string[];
  /**
   * The language ("en", "es", "fr", "de") the agent replies in and the kit's interface uses.
   * `--language=<code>` on the command line wins over it; without either, the system's
   * language (see language.ts). Pass the same value to the chat, wizard or progress view.
   */
  language?: string;
  /**
   * The time zone the date and time tools answer in (`current_time`, `date_math`), an IANA
   * name such as "Europe/Madrid"; the system's if not given.
   */
  timeZone?: string;
}

/**
 * Everything actually *about the domain* that `buildSessionOptions()` needs but doesn't
 * decide itself: which system prompt to build, which MCP servers to talk to besides the
 * generic human-in-the-loop/knowledge ones this kit already wires up, which local plugin
 * roots (skills/commands) to load, and which opt-in subagents (if any) to register.
 *
 * Deliberately not named `AgentDefinition`: the SDK already uses that name for a single
 * subagent's own definition (`Options.agents: Record<string, AgentDefinition>`), and this
 * is a level above that — it's what decides *which* subagents get registered, among other
 * things.
 */
export interface AgentSpec<TConfig extends BaseSessionConfig> {
  /** The system prompt for this run — everything role/mode/domain-specific lives behind this call. */
  buildSystemPrompt(config: TConfig): string;

  /**
   * Who the agent is. With it, the kit tells the model its name, version and what it is, plus
   * agent-kit's version, and offers the `agent-help` skill, which answers how to use the
   * agent: the kit's chat (modes, keys, slash commands, resuming) and `helpGuide`. Without
   * it, neither.
   */
  identity?: AgentIdentity;
  /**
   * Absolute path of a markdown guide to the agent's own domain (its commands, configuration,
   * folders), which the `agent-help` skill includes. Only with `identity`.
   */
  helpGuide?: string;

  /**
   * MCP servers this agent always registers (e.g. Playwright for a browser-driving
   * agent), on top of the generic ones `buildSessionOptions()` wires up itself when
   * applicable (human approval, manual intervention, save-to-knowledge) — those aren't
   * part of the spec because they're driven by `mode` plus this spec's own
   * `manualInterventionTexts`/`knowledgeDir`/`sourcesDir`, not by anything else
   * domain-specific.
   */
  buildMcpServers(config: TConfig, runDir: string): Record<string, McpServerConfig>;

  /**
   * Local plugin roots (skills/commands, SDK "local" plugin type) to load, in the order
   * given, when the session has file tools (`config.knowledgeDir`/`config.sourcesDir`). Absolute paths; `buildSessionOptions()`
   * doesn't know or care where they live on disk.
   */
  pluginRoots(config: TConfig): string[];

  /**
   * Opt-in subagents (the SDK's `Options.agents`) this spec wants registered for this
   * config, plus which `subagent_type` values are therefore allowed to be spawned via the
   * `Agent` tool (see hooks/subagentTypeGate.ts — the SDK's own built-in
   * "general-purpose" type is always spawnable regardless of this list, which is exactly
   * why that gate exists). Returns `undefined` when this config needs no subagents at
   * all, so `buildSessionOptions()` knows not to grant `Agent`/`Bash` in the first place.
   */
  buildSubagents(config: TConfig): { agents: Record<string, SdkSubagentDefinition>; allowedSubagentTypes: string[] } | undefined;

  /**
   * Tool names to explicitly block regardless of what `canUseTool`/`allowAnyMcpTool`
   * would otherwise allow (e.g. a browser-automation agent blocking
   * "mcp__playwright__browser_run_code_unsafe", which Microsoft's own description calls
   * RCE-equivalent). Confirmed empirically that `disallowedTools` takes full precedence
   * over a permissive `canUseTool` — a disallowed tool never even reaches that callback.
   */
  disallowedTools?: string[];

  /** Overrides this kit's generic `save_to_sources` tool description (registered whenever `config.sourcesDir` is set) with domain-specific wording. */
  saveToSourcesDescription?: string;

  /**
   * The extensions the agent runs with (ADR-025), in order: the kit's by name (`"knowledge"`, the
   * built-in knowledge base in `config.knowledgeDir`; `"sources"`, the originals in
   * `config.sourcesDir`), and the agent's own as objects (an `Extension`: its plugin and what it
   * brings). An extension the session lacks something for (its folder), or whose required
   * capabilities nothing enabled provides, is left out, and the prompt says why. None by default.
   * Without `"knowledge"`, `knowledgeDir` is a folder of the agent's own notes, kept with the file
   * tools under rules it writes itself.
   */
  extensions?: (string | Extension)[];
  /**
   * The agent's own page types for the built-in knowledge base, besides the kit's
   * (summary, concept, entity, synthesis, preference): each with its folder (`""` for the root),
   * index section, description (told to the model) and template.
   */
  knowledgePageTypes?: PageType[];
  /**
   * The knowledge base's store, instead of the kit's over markdown files in `knowledgeDir`
   * (e.g. a database or a vector store implementing `KnowledgeStore`).
   */
  knowledgeStore?(config: TConfig): KnowledgeStore;

  /**
   * Whether the kit tells the agent (and each subagent) to reply in the resolved language
   * (`config.language`, `--language`, the system's), following the human if they write in
   * another one. On by default; `false` leaves the reply language to the agent's own prompt.
   */
  replyInLanguage?: boolean;

  /**
   * Which filesystem settings the session loads (the SDK's `settingSources`): "project" is
   * the project's `.claude/` (settings, skills, commands) and its CLAUDE.md files, "local"
   * its `.claude/settings.local.json`, "user" the runner's own `~/.claude/` (settings,
   * CLAUDE.md, skills). Default `["project"]`: the runner's personal Claude Code
   * configuration (its `language`, output style, CLAUDE.md, hooks...) never reaches the
   * agent unless asked for with "user" — the SDK's own default loads all three, and the
   * runner's `language` setting then outranked the agent's prompt. `[]` isolates the agent
   * from every settings file, CLAUDE.md included.
   */
  settingSources?: SettingSource[];

  /**
   * The skills the agent offers (the SDK's `skills`): names, or `plugin:skill` for a
   * plugin's. Default `"all"`, every skill found: the SDK's own (about twenty, whatever
   * `settingSources` says), the project's, the plugins'. `"plugins"` offers only those of the
   * plugins the session loads (`pluginRoots`, the knowledge base's, agent-help's), without
   * naming them. A list keeps the rest out of each turn's context; the knowledge base's own
   * skills are added to it when the knowledge base is on. A context filter, not a sandbox.
   */
  skills?: string[] | "all" | "plugins";

  /**
   * Text for the generic human-approval checkpoint (see tools/humanApproval.ts) — what
   * counts as "publishing something visible to others" is entirely domain-specific.
   * Omit to use this kit's own generic, domain-neutral defaults.
   */
  humanApprovalTexts?: { description: string; approved: string; rejected: string };

  /**
   * Text for the generic manual-intervention checkpoint (see tools/manualLogin.ts), AND
   * this domain's opt-in signal for offering that checkpoint at all: `buildSessionOptions()`
   * only registers `request_manual_login` when this is set (and `mode !== "autonomous"`).
   * Manual intervention only makes sense for a domain that drives some live UI a human could
   * actually step into by hand (a browser window, say) — there's no generic default to fall
   * back to the way there is for `humanApprovalTexts` above, because this kit can't assume
   * every agent built on it has such a UI at all. Leave unset for a domain that doesn't.
   */
  manualInterventionTexts?: {
    toolDescription: string;
    confirmedMessage: string;
    checkpointTitle: string;
    checkpointLines: string[];
    checkpointQuestion?: string;
  };

  /**
   * What the agent may still do in "plan" mode, where it only reads and plans (see
   * hooks/planGate.ts). Without it, the agent can read, search, ask a human and delegate,
   * writes nothing and presents its plan in its reply.
   */
  planMode?: PlanModeSpec<TConfig>;
}

/** Who an agent is, as told to its model (`AgentSpec.identity`). */
export interface AgentIdentity {
  /** The agent's name, e.g. "padawan". */
  name: string;
  /** Its version, e.g. its package's. */
  version?: string;
  /** What it is, in one line, e.g. "an agent that takes a Moodle course as a student". */
  description?: string;
}

/** The domain's part of "plan" mode: which files hold the plan and which of its own tools only read. */
export interface PlanModeSpec<TConfig extends BaseSessionConfig = BaseSessionConfig> {
  /**
   * Whether `filePath` (absolute) is a plan file Write/Edit may touch in plan mode, e.g.
   * `drafts/<slug>/plan.md`. It must also be writable under the file scope (`knowledgeDir`
   * or `extraWritableDirs`), which still applies.
   */
  isPlanFile?(filePath: string, config: TConfig): boolean;
  /**
   * Whether one of the agent's own MCP tools (`mcp__<server>__<tool>`) only reads, so plan
   * mode lets it run. Every MCP tool it doesn't vouch for is denied there: a forgotten tool
   * can't change anything.
   */
  isReadOnlyTool?(toolName: string, input: Record<string, unknown>): boolean;
}
