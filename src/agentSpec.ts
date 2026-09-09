import type { AgentDefinition as SdkSubagentDefinition, McpServerConfig } from "@anthropic-ai/claude-agent-sdk";

/**
 * The behavioral spectrum every agent built on this kit shares, independent of domain:
 * "interactive" pauses before every single action, "guided" only pauses before a
 * hard-to-undo/visible-to-others action, "autonomous" has no human-in-the-loop channel at
 * all, and "chat" is a multi-turn conversation (behaves like "guided" for approval
 * purposes). See session.ts's buildSessionOptions() for exactly what each mode changes.
 */
export type Mode = "interactive" | "guided" | "autonomous" | "chat";

/**
 * The minimum a config object needs to drive `buildSessionOptions()` — a concrete agent's
 * own config type (e.g. moodle-agent's `Config`) extends this with whatever domain fields
 * it needs (a course URL, credentials, ...), which `buildSessionOptions()` itself never
 * looks at directly: only `AgentSpec`'s methods receive the full concrete config.
 */
export interface BaseSessionConfig {
  mode: Mode;
  /** What persona/profile the agent acts as in this session (e.g. "student"/"teacher") — an opaque string as far as this kit is concerned; only `AgentSpec` interprets it. */
  role: string;
  headless: boolean;
  /** Project root: the folder under which context/knowledge/sessions live (see the project-directory helpers). */
  projectDir: string;
  /** Only set when this session has a project directory with its own context/knowledge (as opposed to a config-less/legacy invocation). */
  contextDir?: string;
  knowledgeDir?: string;
  /** Extra values (e.g. a password) to scrub out of the transcript log — see hooks/transcriptLogger.ts. */
  secrets?: string[];
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
   * MCP servers this agent always registers (e.g. Playwright for a browser-driving
   * agent), on top of the generic ones `buildSessionOptions()` wires up itself when
   * applicable (human approval, manual intervention, save-to-knowledge) — those aren't
   * part of the spec because they're driven by generic `BaseSessionConfig` fields (mode,
   * headless, contextDir/knowledgeDir), not by anything domain-specific.
   */
  buildMcpServers(config: TConfig, runDir: string): Record<string, McpServerConfig>;

  /**
   * Local plugin roots (skills/commands, SDK "local" plugin type) to load, in the order
   * given, when `config.contextDir` is set. Absolute paths; `buildSessionOptions()`
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

  /** Overrides this kit's generic `save_to_knowledge` tool description with domain-specific wording. */
  saveToKnowledgeDescription?: string;

  /**
   * Text for the generic human-approval checkpoint (see tools/humanApproval.ts) — what
   * counts as "publishing something visible to others" is entirely domain-specific.
   * Omit to use this kit's own generic, domain-neutral defaults.
   */
  humanApprovalTexts?: { description: string; approved: string; rejected: string };

  /**
   * Text for the generic manual-intervention checkpoint (see tools/manualLogin.ts) — what
   * exactly a human needs to do by hand (log into a site, solve a captcha, ...) is
   * domain-specific. Omit to use this kit's own generic defaults.
   */
  manualInterventionTexts?: {
    toolDescription: string;
    confirmedMessage: string;
    checkpointTitle: string;
    checkpointLines: string[];
    checkpointQuestion?: string;
  };
}
