import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createTranscriptLogger, type TranscriptLogger } from "./hooks/transcriptLogger.js";
import { createStepGate } from "./hooks/stepGate.js";
import { createSubagentBashGate } from "./hooks/subagentBashGate.js";
import { createSubagentTypeGate } from "./hooks/subagentTypeGate.js";
import { createSubagentForegroundGate } from "./hooks/subagentForegroundGate.js";
import { createFileScopeGate } from "./hooks/fileScopeGate.js";
import { createPlanGate } from "./hooks/planGate.js";
import { createHumanApprovalServer } from "./tools/humanApproval.js";
import { createManualLoginServer } from "./tools/manualLogin.js";
import { createSaveToSourcesServer, sourcesPromptSection } from "./tools/saveToSources.js";
import { createTimeServer } from "./tools/time.js";
import { TODO_TOOL } from "./todos.js";
import { createModeControl, type ModeControl } from "./modeControl.js";
import { createFileKnowledgeStore } from "./fileKnowledgeStore.js";
import type { KnowledgeStore } from "./knowledgeStore.js";
import { createKnowledgeServer } from "./tools/knowledgeTools.js";
import { allowAnyMcpTool } from "./mcpPermissions.js";
import { knowledgePluginRoot, knowledgePromptSection } from "./knowledge.js";
import { AGENT_HELP_SKILL, identityPromptSection, writeAgentHelpPlugin } from "./agentHelp.js";
import type { AgentSpec, BaseSessionConfig } from "./agentSpec.js";
import { replyLanguageInstruction, type Language } from "./language.js";
import { chooseLanguage } from "./messages/index.js";
import { createRunStore, type RunFolder } from "./runs.js";

/**
 * Builds the `options` object passed to the Agent SDK's `query()` — everything about
 * *how* the agent runs a session (system prompt, tools, MCP servers, hooks), independent
 * of *what* is said to start it off (that's the caller's `prompt`, a plain string for a
 * one-shot run or an `AsyncIterable` for a multi-turn chat).
 *
 * Everything actually *about the domain* (which system prompt, which MCP servers besides
 * the generic human-in-the-loop/knowledge ones below, which plugin roots, which
 * subagents) is behind `spec` (see agentSpec.ts) — this function only knows the generic
 * fields on `BaseSessionConfig`.
 *
 * The per-mode behavioral differences (whether the approval/manual-intervention tools
 * exist, whether the interactive step gate or the plan gate decides) all fall out of
 * `config.mode` and the session's `ModeControl` alone.
 *
 * `options.run` keeps the SDK's transcript of the conversation in that run folder (see
 * runs.ts's createRunStore()) and, when it has a session already, resumes it: the chat
 * passes it when the agent gives it a runs folder (`InkChatOptions.runsDir`).
 */
export async function buildSessionOptions<TConfig extends BaseSessionConfig>(
  config: TConfig,
  runDir: string,
  spec: AgentSpec<TConfig>,
  options: { autoCompactEnabled?: boolean; run?: RunFolder } = {},
): Promise<{
  options: Options;
  transcriptLogger: TranscriptLogger;
  transcriptPath: string;
  modeControl: ModeControl;
  language: Language;
  /** The knowledge base's store, when the agent reaches it through the `knowledge_*` tools. */
  knowledgeStore?: KnowledgeStore;
}> {
  const { mode } = config;
  // The kit's language (`--language`, then config.language, then the system's), chosen here
  // for the interface too, so the agent answers in the language its interface is in.
  const language = chooseLanguage(config.language);
  const replyLine = spec.replyInLanguage === false ? null : replyLanguageInstruction(language);
  const withReplyLine = (prompt: string): string => (replyLine ? `${prompt}\n\n${replyLine}` : prompt);
  const modeControl = createModeControl(mode);

  // The human approval server only exists outside autonomous mode: the point of
  // autonomous is that the agent has no channel to ask for human intervention at all.
  const includeApprovalTool = mode !== "autonomous";
  // Manual intervention only makes sense for a domain that drives some live UI a human
  // could actually step into by hand — `spec.manualInterventionTexts` being set is that
  // domain's own opt-in signal (see its doc comment in agentSpec.ts), not a generic
  // boolean this kit could infer on its own.
  const manualInterventionTexts = mode !== "autonomous" ? spec.manualInterventionTexts : undefined;
  // The file tools exist as soon as the project has a place for the agent's notes
  // (`knowledgeDir`) or for original files (`sourcesDir`) — there is no separate "context"
  // folder: material the user provides is just more of `sourcesDir`.
  const includeFileTools = Boolean(config.knowledgeDir || config.sourcesDir);
  // The built-in knowledge base (rules in the system prompt + its skills/commands as a plugin) needs
  // somewhere to keep the wiki, so it follows `knowledgeDir`; `spec.knowledgeBase: false` opts out.
  const includeKnowledgeBase = Boolean(config.knowledgeDir) && spec.knowledgeBase !== false;
  // The agent reaches it only through the `knowledge_*` tools, over a store, never with the file
  // tools (ADR-024). Without it (`knowledgeBase: false`), `knowledgeDir` is a folder of the
  // agent's own notes, kept with the file tools under its own rules.
  const notesDir = includeKnowledgeBase ? undefined : config.knowledgeDir;
  const extraDirs = config.extraWritableDirs ?? [];
  const readableExtras = config.extraReadableDirs ?? [];
  // With the knowledge base, the file tools are only for the originals (reading) and the extra
  // folders; without either, none.
  const fileTools = !includeFileTools
    ? []
    : !includeKnowledgeBase
      ? ["Read", "Write", "Edit", "Glob", "Grep"]
      : [...(config.sourcesDir || extraDirs.length || readableExtras.length ? ["Read", "Glob", "Grep"] : []), ...(extraDirs.length ? ["Write", "Edit"] : [])];
  // Where Write/Edit may act and Grep may search (see hooks/fileScopeGate.ts): the
  // project's own folders, never the whole cwd — which would include whatever else the
  // project directory holds (the user's config...). `sourcesDir` is searchable but
  // deliberately NOT writable: originals stay as obtained, and the only way to add to it is
  // the `save_to_sources` tool (which never overwrites).
  const writableDirs = [notesDir, ...extraDirs].filter((d): d is string => Boolean(d));
  const searchableDirs = [notesDir, config.sourcesDir, ...extraDirs, ...readableExtras].filter((d): d is string => Boolean(d));
  const readOnlyDirs = config.sourcesDir ? [config.sourcesDir] : [];
  // Skills/commands/plugins are a separate concern from the file tools: an agent that
  // wants a plugin-provided skill/command but has no notes or sources folder shouldn't have
  // to invent one just to get `cwd`/`skills: "all"`/`plugins` wired up. Gated on either
  // signal, not on `pluginRoots` alone, so an agent with file tools keeps getting the SDK's
  // own project-level `.claude/skills`/`.claude/commands` discovery.
  // With an identity, the agent-help skill (agentHelp.ts): written into the run's folder, since
  // it carries this session's facts and the agent's own guide.
  const helpPlugin = spec.identity
    ? await writeAgentHelpPlugin(
        path.join(runDir, "agent-help"),
        {
          mode,
          switchable: modeControl.switchable,
          knowledgeBase: includeKnowledgeBase,
          ...(config.sourcesDir ? { sourcesFolder: `${path.relative(config.projectDir, config.sourcesDir).split(path.sep).join("/")}/` } : {}),
        },
        spec.helpGuide,
      )
    : undefined;
  const pluginRoots = [
    ...spec.pluginRoots(config),
    ...(includeKnowledgeBase ? [knowledgePluginRoot()] : []),
    ...(helpPlugin ? [helpPlugin] : []),
  ];
  const knowledgeStore: KnowledgeStore | undefined =
    includeKnowledgeBase && config.knowledgeDir
      ? (spec.knowledgeStore?.(config) ?? createFileKnowledgeStore(config.knowledgeDir, { pageTypes: spec.knowledgePageTypes }))
      : undefined;
  const includeSkillsAndPlugins = includeFileTools || pluginRoots.length > 0;
  // "plugins": the skills of the plugins loaded, named as the SDK names them.
  const offeredSkills = spec.skills === "plugins" ? await pluginSkills(pluginRoots) : spec.skills;
  const skillTools = includeSkillsAndPlugins ? ["Skill"] : [];
  // Whatever opt-in subagents `spec` wants for this config, or undefined if none apply.
  // Subagents need the Agent tool (to delegate to them), and Bash when one of them uses it
  // (used only by the subagent itself — see createSubagentBashGate() below, which denies Bash
  // to the main agent regardless of which one put it in `tools`) — Bash has to be present
  // in this session's own tools for any subagent to be allowed to use it at all
  // (confirmed empirically the SDK refuses to spawn a subagent whose own tools list names
  // anything not already present here — which is why the hook, not just omitting "Bash"
  // from this list, is what actually confines it to subagent use).
  const subagents = spec.buildSubagents(config);
  // Each subagent gets the reply line too: its prompt doesn't include the main one's.
  const subagentDefinitions = subagents
    ? Object.fromEntries(Object.entries(subagents.agents).map(([name, agent]) => [name, { ...agent, prompt: withReplyLine(agent.prompt) }]))
    : undefined;
  const includeSubagentTools = subagents !== undefined;
  // Bash only when a subagent can use it: one that lists it, or one without `tools`, which
  // inherits every session tool. Its definition costs about 1.9k input tokens on every call
  // (measured), and the main agent can't use it anyway.
  const subagentTools = includeSubagentTools
    ? ["Agent", ...(Object.values(subagents.agents).some((agent) => !agent.tools || agent.tools.includes("Bash")) ? ["Bash"] : [])]
    : [];
  // The exact set of subagent_type values the Agent tool may spawn in this session — see
  // createSubagentTypeGate() below for why this can't just be "whatever's in `agents`
  // below": the SDK's own built-in "general-purpose" type is spawnable regardless of that
  // map, and inherits the full session tools (Bash included) rather than the narrow list
  // each declared subagent actually declares.
  const allowedSubagentTypes = subagents?.allowedSubagentTypes ?? [];

  const transcriptPath = path.join(runDir, "transcript.jsonl");
  const transcriptLogger = createTranscriptLogger(transcriptPath, config.secrets ?? []);

  // The person's preferences, by title, for the knowledge base's section (#33).
  const preferences = knowledgeStore
    ? (await knowledgeStore.list()).filter((page) => page.type === "preference" && page.status === "active").map(({ id, title }) => ({ id, title }))
    : [];
  const promptSections = [
    spec.buildSystemPrompt(config),
    ...(spec.identity ? [identityPromptSection(spec.identity)] : []),
    // The sources' own section, with or without a knowledge base (#30).
    ...(config.sourcesDir ? [sourcesPromptSection(config.projectDir, config.sourcesDir)] : []),
    ...(includeKnowledgeBase && config.knowledgeDir
      ? [knowledgePromptSection({ withSources: Boolean(config.sourcesDir), pageTypes: knowledgeStore?.types(), preferences })]
      : []),
  ];

  const sdkOptions: Options = {
    systemPrompt: withReplyLine(promptSections.join("\n\n")),
    // Not the SDK's default (every source): "user" hands the agent the runner's own Claude
    // Code configuration, and its `language` setting outranked the agent's prompt.
    settingSources: spec.settingSources ?? ["project"],
    // autoMemoryEnabled: false keeps out the runner's own Claude Code memory for the project
    // (~/.claude/projects/<repository>/memory/MEMORY.md), which the CLI loads whatever
    // settingSources says (confirmed empirically): it's notes for them, not for this agent,
    // whose own memory is the knowledge base. includeGitInstructions: false leaves out the
    // CLI's commit workflow and git context (the runner's git user name among it), which no
    // agent here needs and which pulled replies towards the runner's language (confirmed
    // empirically, see ADR-018). disableClaudeAiConnectors: true keeps out the claude.ai
    // connectors of the account the session runs with (Drive, Gmail…), which the CLI fetches
    // whatever settingSources says (confirmed empirically): the runner's integrations, not the
    // agent's. An MCP server the agent passes itself is unaffected.
    settings: {
      autoCompactEnabled: options.autoCompactEnabled ?? true,
      autoMemoryEnabled: false,
      includeGitInstructions: false,
      disableClaudeAiConnectors: true,
    },
    // No built-in tools except, if applicable, Read/Write/Edit/Glob/Grep scoped to the
    // project's own folders (fileScopeGate below), and WebFetch/WebSearch
    // with no domain restriction (not conditioned on includeFileTools: it's read-only,
    // doesn't depend on there being a project directory) — any priority order between
    // them is the domain's own system prompt's job to establish, not this function's.
    // "Skill" has to be listed explicitly: with an explicit `tools` list the SDK loads the
    // skills (they show up in the init message) but doesn't offer the tool to invoke them,
    // so the model ends up looking for SKILL.md files by hand (confirmed empirically).
    // TodoWrite: the SDK's task list for long jobs, in every session (the chats show the list
    // instead of the calls; see todos.ts). Accepted in an explicit list (confirmed empirically).
    tools: [...fileTools, ...skillTools, "WebFetch", "WebSearch", TODO_TOOL, ...subagentTools],
    allowedTools: [...fileTools, ...skillTools, "WebFetch", "WebSearch", TODO_TOOL, ...subagentTools],
    // Every mcp__* tool (whatever spec.buildMcpServers() registers, approvals/manualLogin
    // when enabled below, sourceFiles, and any server a project's own .mcp.json
    // declares) is approved generically here rather than listed one by one — see
    // mcpPermissions.ts for why a fixed allowedTools wildcard can't cover a server whose
    // name isn't known ahead of time.
    canUseTool: allowAnyMcpTool,
    disallowedTools: spec.disallowedTools ?? [],
    // TodoWrite (todos.ts) only exists with CLAUDE_CODE_ENABLE_TASKS=0: by default the CLI
    // offers its TaskCreate/TaskUpdate/TaskList/TaskGet tools instead, and drops TodoWrite from
    // the session even when `tools` names it (confirmed empirically). `env` replaces the
    // subprocess environment, so the rest is passed on as it is.
    env: { ...process.env, CLAUDE_CODE_ENABLE_TASKS: "0" },
    // Real text streaming instead of silently waiting for the turn's complete message —
    // see the caller's message loop.
    includePartialMessages: true,
    ...(includeSkillsAndPlugins
      ? {
          // With cwd pointing at the project, the SDK's own "project settings" discovery
          // finds <project>/.claude/skills/ on its own — the user's own custom
          // skills, on top of the plugin-provided built-ins from spec.pluginRoots()
          // below. skipMcpDiscovery: true on those plugins is the caller's choice.
          cwd: config.projectDir,
          // Empty when there's no knowledgeDir/sourcesDir (the plugin-only case) — an
          // empty array is a valid, no-op value for this SDK option, not omitted, since
          // this whole block is already conditioned on includeSkillsAndPlugins.
          additionalDirectories: searchableDirs,
          // "skills" acts as a name whitelist, not an addition: "all" enables both the
          // SDK's own official skills (pdf/docx), the project's own custom ones, and the
          // plugin-provided built-ins below. A spec's own list gets the knowledge base's
          // skills and agent-help added, so it only names its own.
          skills: skillList(offeredSkills, includeKnowledgeBase, Boolean(helpPlugin)),
          plugins: pluginRoots.map((pluginPath) => ({ type: "local" as const, path: pluginPath, skipMcpDiscovery: true })),
        }
      : {}),
    maxTurns: 400,
    ...(options.run ? { sessionStore: createRunStore(options.run.dir), ...(options.run.sessionId ? { resume: options.run.sessionId } : {}) } : {}),
    ...(subagentDefinitions ? { agents: subagentDefinitions } : {}),
    mcpServers: {
      ...spec.buildMcpServers(config, runDir),
      ...(includeApprovalTool ? { approvals: createHumanApprovalServer(runDir, spec.humanApprovalTexts, { modeControl }) } : {}),
      ...(manualInterventionTexts ? { manualLogin: createManualLoginServer(runDir, manualInterventionTexts) } : {}),
      // The sources folder's tools (tools/saveToSources.ts); asking a person (request_file,
      // retire_source) only where there is one.
      ...(config.sourcesDir
        ? {
            sourceFiles: createSaveToSourcesServer(runDir, config.sourcesDir, spec.saveToSourcesDescription, {
              projectDir: config.projectDir,
              interactive: mode !== "autonomous",
            }),
          }
        : {}),
      // The knowledge base's own tools, over its store (tools/knowledgeTools.ts, ADR-024).
      ...(knowledgeStore
        ? {
            knowledge: createKnowledgeServer(knowledgeStore, { runDir, interactive: mode !== "autonomous" }),
          }
        : {}),
      // The date and date arithmetic, in every session and mode: only reads (tools/time.ts).
      time: createTimeServer(config.timeZone),
    },
    hooks: {
      PreToolUse: [
        { hooks: [transcriptLogger.preToolUse] },
        ...(includeFileTools
          ? [{ hooks: [createFileScopeGate({
                    projectDir: config.projectDir,
                    writableDirs,
                    searchableDirs,
                    readOnlyDirs,
                    // The SDK's own credentials, whatever the agent denies.
                    deniedPaths: [...(config.deniedPaths ?? []), path.join(claudeConfigDir(), ".credentials.json")],
                    // Read and Glob only in the agent's folders, plus what only the kit knows it
                    // needs: the run folder, the plugins, the project's .claude/ (when loaded) and
                    // the SDK's large tool results. Never the rest of the disk (~/.ssh, other
                    // projects' .env...), which an agent reading untrusted content could be talked into.
                    readableDirs: searchableDirs,
                    alsoReadable: [runDir, ...pluginRoots, ...((spec.settingSources ?? ["project"]).includes("project") ? [path.join(config.projectDir, ".claude")] : [])],
                    toolResultsRoot: claudeProjectDir(config.projectDir),
                    ...(includeKnowledgeBase && config.knowledgeDir ? { toolOnlyDirs: [{ dir: config.knowledgeDir, instead: "the knowledge_* tools" }] } : {}),
                  }),
                ] }]
          : []),
        // Registered wherever the approval tool is, and asking only while the current mode is
        // "interactive": a guided session can switch to interactive and back (ModeControl).
        ...(includeApprovalTool ? [{ hooks: [createStepGate(runDir, () => modeControl.mode === "interactive")] }] : []),
        // Likewise for "plan", which any non-autonomous session can switch into: the agent
        // only reads and plans while it's on (hooks/planGate.ts).
        ...(includeApprovalTool
          ? [
              {
                hooks: [
                  createPlanGate(
                    {
                      projectDir: config.projectDir,
                      ...(spec.planMode?.isPlanFile ? { isPlanFile: (filePath: string) => spec.planMode!.isPlanFile!(filePath, config) } : {}),
                      ...(spec.planMode?.isReadOnlyTool ? { isReadOnlyTool: spec.planMode.isReadOnlyTool } : {}),
                    },
                    () => modeControl.mode === "plan",
                  ),
                ],
              },
            ]
          : []),
        ...(includeSubagentTools
          ? [
              { hooks: [createSubagentTypeGate(allowedSubagentTypes)] },
              { hooks: [createSubagentBashGate()] },
              { hooks: [createSubagentForegroundGate(allowedSubagentTypes)] },
            ]
          : []),
      ],
      PostToolUse: [{ hooks: [transcriptLogger.postToolUse] }],
    },
  };

  return { options: sdkOptions, transcriptLogger, transcriptPath, modeControl, language, ...(knowledgeStore ? { knowledgeStore } : {}) };
}

export { createModeControl, togglePlanMode, type ModeControl } from "./modeControl.js";

/** The Claude Code configuration folder the SDK's CLI uses: `CLAUDE_CONFIG_DIR`, or `~/.claude`. */
function claudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/**
 * The CLI's folder for a project, where it keeps each session's transcript and large tool
 * results (`<session>/tool-results/`): the project's path with every character but letters
 * and digits as "-" (confirmed empirically).
 */
export function claudeProjectDir(projectDir: string): string {
  return path.join(claudeConfigDir(), "projects", path.resolve(projectDir).replace(/[^a-zA-Z0-9]/g, "-"));
}

/** The knowledge plugin's skills, as the SDK names a plugin's skills ("plugin:skill"). */
const KNOWLEDGE_SKILLS = ["knowledge-ingest", "knowledge-query", "knowledge-lint"].map((skill) => `knowledge:${skill}`);

/**
 * The skills of the plugins in `roots`, as the SDK names them: `<plugin>:<folder>`, the
 * plugin's name from its `.claude-plugin/plugin.json` and the skill's folder under `skills/`,
 * whatever its frontmatter's `name` says (confirmed empirically).
 */
export async function pluginSkills(roots: readonly string[]): Promise<string[]> {
  const names: string[] = [];
  for (const root of roots) {
    let plugin: string | undefined;
    try {
      plugin = (JSON.parse(await readFile(path.join(root, ".claude-plugin", "plugin.json"), "utf8")) as { name?: string }).name;
    } catch {
      continue; // not a plugin the SDK would load
    }
    if (!plugin) continue;
    const folders = await readdir(path.join(root, "skills"), { withFileTypes: true }).catch(() => []);
    for (const folder of folders.filter((entry) => entry.isDirectory())) {
      const hasSkill = await readFile(path.join(root, "skills", folder.name, "SKILL.md")).then(() => true, () => false);
      if (hasSkill) names.push(`${plugin}:${folder.name}`);
    }
  }
  return names;
}

function skillList(skills: string[] | "all" | undefined, knowledgeBase: boolean, agentHelp: boolean): string[] | "all" {
  if (skills === undefined || skills === "all") return "all";
  return [...new Set([...skills, ...(knowledgeBase ? KNOWLEDGE_SKILLS : []), ...(agentHelp ? [AGENT_HELP_SKILL] : [])])];
}

/**
 * User message queue backed by a single long-lived generator, for any multi-turn
 * (chat-shaped) caller of `query()`.
 *
 * The SDK closes the transport as soon as the AsyncIterable passed as `prompt` (or to
 * `streamInput()`) finishes iterating — so a "one message and done" generator leaves the
 * transport closed right after sending that message, and the next call blows up with
 * "ProcessTransport is not ready for writing". A real multi-turn conversation needs a
 * single generator that never finishes on its own: messages get pushed into it with
 * `push()` and it's only explicitly closed with `end()` when leaving the chat.
 *
 * With `modeControl`, each message goes after the note on a plan-mode switch the model
 * hasn't been told about yet (`ModeControl.takeNotice()`).
 */
export function createInputQueue(options: { modeControl?: ModeControl } = {}): {
  push: (text: string) => void;
  end: () => void;
  iterable: AsyncIterable<SDKUserMessage>;
} {
  const pending: string[] = [];
  let wake: (() => void) | null = null;
  let ended = false;

  async function* generator(): AsyncGenerator<SDKUserMessage> {
    while (!ended) {
      const text = pending.shift();
      if (text === undefined) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        continue;
      }
      yield {
        type: "user",
        message: { role: "user", content: text },
        parent_tool_use_id: null,
      };
    }
  }

  return {
    push(text: string) {
      const notice = options.modeControl?.takeNotice?.();
      pending.push(notice ? `${notice}\n\n${text}` : text);
      wake?.();
      wake = null;
    },
    end() {
      ended = true;
      wake?.();
      wake = null;
    },
    iterable: generator(),
  };
}

/** Externally-controllable promise — used to know when a chat turn has finished. */
export function createDeferred(): { promise: Promise<void>; resolve: () => void } {
  let resolveFn!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolveFn = resolve;
  });
  return { promise, resolve: resolveFn };
}
