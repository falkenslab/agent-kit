import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { HookCallbackMatcher, HookEvent, Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createTranscriptLogger, type TranscriptLogger } from "./hooks/transcriptLogger.js";
import { createStepGate } from "./hooks/stepGate.js";
import { createSubagentBashGate } from "./hooks/subagentBashGate.js";
import { createSubagentTypeGate } from "./hooks/subagentTypeGate.js";
import { createSubagentForegroundGate } from "./hooks/subagentForegroundGate.js";
import { createFileScopeGate } from "./hooks/fileScopeGate.js";
import { createPlanGate } from "./hooks/planGate.js";
import { createHumanApprovalServer } from "./tools/humanApproval.js";
import { createManualLoginServer } from "./tools/manualLogin.js";
import { createTimeServer } from "./tools/time.js";
import { TODO_TOOL } from "./todos.js";
import { createModeControl, type ModeControl } from "./modeControl.js";
import type { KnowledgeStore } from "../extensions/knowledge/knowledgeStore.js";
import { extensionsPromptSection, resolveExtensions, skillsMissingCapabilities, type ExtensionContribution } from "./extensions.js";
import { allowAnyMcpTool } from "./mcpPermissions.js";
import { pluginAgents } from "./pluginAgents.js";
import { outsideArchive, unpackedClaudeExecutable } from "./packaged.js";
import { listInstalled, loadExternalExtensions, type ExtensionDirs, type InstalledExtension } from "./externalExtensions.js";
import type { ToolLabels } from "./toolLabels.js";
import type { AgentSpec, BaseSessionConfig } from "./agentSpec.js";
import { replyLanguageInstruction, type Language } from "./language.js";
import { chooseLanguage } from "./messages/index.js";
import { createRunStore, type RunFolder } from "./runs.js";
import { createSessionView, registerSessionView, type SessionView } from "./sessionFacts.js";
import { agentKitVersion } from "./version.js";

/**
 * Builds the `options` object passed to the Agent SDK's `query()` — everything about
 * *how* the agent runs a session (system prompt, tools, MCP servers, hooks), independent
 * of *what* is said to start it off (that's the caller's `prompt`, a plain string for a
 * one-shot run or an `AsyncIterable` for a multi-turn chat).
 *
 * Everything actually *about the domain* (which system prompt, which MCP servers besides
 * the generic human-in-the-loop ones below, which plugin roots, which subagents) is behind
 * `spec` (see agentSpec.ts), and the kit's optional parts (the knowledge base, the sources
 * folder) are extensions whose contributions this function puts together (extensions.ts,
 * ADR-025): it names none of them.
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
  /** How the chat shows the extensions' tools (`runChatInk()` takes them from a session opener). */
  toolLabels: ToolLabels;
  /** The installed extensions and what this session runs with, for `/extensions` (#37). */
  extensions: ExtensionsStatus;
  /** The knowledge base's store, when the knowledge extension is on (for a host that reads the knowledge base). */
  knowledgeStore?: KnowledgeStore;
  /** What each active extension hands the host (its contribution's `api`), by its name: the sources' `addSource`, the knowledge base's store. */
  apis: Record<string, Record<string, unknown>>;
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
  // What the enabled extensions bring (ADR-025): their tools, prompt sections, plugins and
  // folders, put together here.
  // `session()` reads the view built below, once the options are: an extension's tools call it later.
  const late: { view?: SessionView } = {};
  const extensionContext = {
    config,
    spec,
    runDir,
    mode,
    interactive: mode !== "autonomous",
    session: () => (late.view ? late.view.facts() : Promise.reject(new Error("The session isn't built yet: call session() from a tool, not from contribute()."))),
  };
  // The installed ones (#37), the project's over the agent's: those that can't load are off with
  // why, and so is one named like an extension the spec enables.
  const extensionDirs = config.extensionDirs ?? {};
  const external = await loadExternalExtensions(extensionDirs);
  const enabledNames = new Set((spec.extensions ?? []).map((entry) => (typeof entry === "string" ? entry : entry.name)));
  const resolved = resolveExtensions([...(spec.extensions ?? []), ...external.extensions.filter((extension) => !enabledNames.has(extension.name))], extensionContext);
  resolved.inactive.push(
    ...external.off,
    ...external.extensions.filter((extension) => enabledNames.has(extension.name)).map((extension) => ({ name: extension.name, reason: "has the name of one this agent already has" })),
  );
  const externalPlugins = new Set(resolved.active.filter(({ extension }) => extension.external).map(({ extension }) => path.resolve(extension.plugin)));
  const added = await Promise.all(resolved.active.map(({ extension }) => extension.contribute(extensionContext)));
  const extensionPlugins = resolved.active.map(({ extension }) => extension.plugin);
  const fromExtensions = <T>(pick: (contribution: ExtensionContribution) => readonly T[] | undefined): T[] => added.flatMap((contribution) => pick(contribution) ?? []);
  const knowledgeStore = added.map((contribution) => contribution.api?.knowledgeStore).find(Boolean) as KnowledgeStore | undefined;
  // An extension may claim `knowledgeDir` as reached only through its tools (the knowledge base,
  // ADR-024); otherwise it's a folder of the agent's own notes, kept with the file tools under
  // its own rules.
  const claimed = (dir: string) => fromExtensions((contribution) => contribution.toolOnlyDirs).some((only) => path.resolve(only.dir) === path.resolve(dir));
  const notesDir = config.knowledgeDir && !claimed(config.knowledgeDir) ? config.knowledgeDir : undefined;
  const extraDirs = config.extraWritableDirs ?? [];
  const readableExtras = config.extraReadableDirs ?? [];
  // The file tools the session needs: all five for the notes and the extra writable folders,
  // the reading ones for the extra readable folders, and whatever the extensions ask for (the
  // sources' reading ones); without any of them, none.
  const wantedFileTools = new Set([
    ...(notesDir || extraDirs.length ? FILE_TOOLS : []),
    ...(readableExtras.length ? ["Read", "Glob", "Grep"] : []),
    ...fromExtensions((contribution) => contribution.fileTools),
  ]);
  const fileTools = FILE_TOOLS.filter((tool) => wantedFileTools.has(tool));
  // Where Write/Edit may act and Grep may search (see hooks/fileScopeGate.ts): the
  // project's own folders, never the whole cwd — which would include whatever else the
  // project directory holds (the user's config...). An extension's folders (the sources) are
  // searchable but deliberately NOT writable: the only way to add to them is its tools.
  const readOnlyDirs = fromExtensions((contribution) => contribution.readOnlyDirs);
  const toolOnlyDirs = fromExtensions((contribution) => contribution.toolOnlyDirs);
  const writableDirs = [notesDir, ...extraDirs].filter((d): d is string => Boolean(d));
  const searchableDirs = [notesDir, ...readOnlyDirs, ...extraDirs, ...readableExtras].filter((d): d is string => Boolean(d));
  // Skills/commands/plugins are a separate concern from the file tools: an agent that
  // wants a plugin-provided skill/command but has no notes or sources folder shouldn't have
  // to invent one just to get `cwd`/`skills: "all"`/`plugins` wired up. Gated on either
  // signal, not on `pluginRoots` alone, so an agent with file tools keeps getting the SDK's
  // own project-level `.claude/skills`/`.claude/commands` discovery.
  // Outside the archive when the agent runs packaged (Electron's app.asar): the CLI reads them (#42).
  const pluginRoots = [...spec.pluginRoots(config), ...extensionPlugins].map(outsideArchive);
  const includeSkillsAndPlugins = fileTools.length > 0 || pluginRoots.length > 0;
  // "plugins": the skills of the plugins loaded, named as the SDK names them. A skill that
  // `requires` a capability no active extension provides is left out; since the SDK's
  // `skillOverrides` doesn't reach plugin skills (confirmed empirically), leaving one out takes
  // a list: the plugins' skills and the project's, without it.
  const missingCapabilities = await skillsMissingCapabilities(pluginRoots, resolved.capabilities);
  const requested = spec.skills === "plugins" ? await pluginSkills(pluginRoots) : spec.skills;
  const offeredSkills =
    missingCapabilities.length && (requested === undefined || requested === "all")
      ? [...(await pluginSkills(pluginRoots)), ...((spec.settingSources ?? ["project"]).includes("project") ? await projectSkills(config.projectDir) : [])]
      : requested;
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
  // The plugins' subagents too (agents/*.md, the agent's and its extensions'), registered as the
  // spec's are: allowed to be spawned, counted in the Agent and Bash decision, and given the
  // reply line (pluginAgents.ts; ADR-025).
  // An installed extension's get no Bash (ADR-025): one without `tools` gets none.
  const fromPlugins = {
    ...(await pluginAgents(pluginRoots.filter((root) => !externalPlugins.has(path.resolve(root))))),
    ...Object.fromEntries(
      Object.entries(await pluginAgents([...externalPlugins])).map(([name, agent]) => [name, { ...agent, tools: (agent.tools ?? []).filter((tool) => tool !== "Bash") }]),
    ),
  };
  const allAgents = { ...fromPlugins, ...(subagents?.agents ?? {}) };
  // Each subagent gets the reply line too: its prompt doesn't include the main one's.
  const subagentDefinitions = Object.keys(allAgents).length
    ? Object.fromEntries(Object.entries(allAgents).map(([name, agent]) => [name, { ...agent, prompt: withReplyLine(agent.prompt) }]))
    : undefined;
  const includeSubagentTools = subagentDefinitions !== undefined;
  // Bash only when a subagent can use it: one that lists it, or one without `tools`, which
  // inherits every session tool. Its definition costs about 1.9k input tokens on every call
  // (measured), and the main agent can't use it anyway.
  const subagentTools = includeSubagentTools
    ? ["Agent", ...(Object.values(allAgents).some((agent) => !agent.tools || agent.tools.includes("Bash")) ? ["Bash"] : [])]
    : [];
  // The exact set of subagent_type values the Agent tool may spawn in this session — see
  // createSubagentTypeGate() below for why this can't just be "whatever's in `agents`
  // below": the SDK's own built-in "general-purpose" type is spawnable regardless of that
  // map, and inherits the full session tools (Bash included) rather than the narrow list
  // each declared subagent actually declares.
  const allowedSubagentTypes = [...new Set([...(subagents?.allowedSubagentTypes ?? []), ...Object.keys(fromPlugins)])];

  const transcriptPath = path.join(runDir, "transcript.jsonl");
  const transcriptLogger = createTranscriptLogger(transcriptPath, config.secrets ?? []);

  const promptSections = [
    spec.buildSystemPrompt(config),
    // What's on and what isn't, then the extensions' own sections.
    ...(resolved.active.length || resolved.inactive.length ? [extensionsPromptSection(resolved)] : []),
    // The extensions' own sections, in their order (the sources' before the knowledge base's).
    ...fromExtensions((contribution) => (contribution.promptSection ? [contribution.promptSection] : [])),
  ];

  // Packaged, the SDK would look for its CLI binary inside the archive, and hang (#42).
  const claudeExecutable = unpackedClaudeExecutable();
  const sdkOptions: Options = {
    ...(claudeExecutable ? { pathToClaudeCodeExecutable: claudeExecutable } : {}),
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
      // An installed extension's plugin may carry hooks: none run (ADR-025). The kit's own,
      // passed in `hooks`, still do (confirmed empirically).
      ...(externalPlugins.size ? { disableAllHooks: true } : {}),
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
          // plugin-provided built-ins below. A spec's own list gets the extensions' skills
          // added, so it only names its own.
          skills: skillList(offeredSkills, await pluginSkills(extensionPlugins), missingCapabilities),
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
      // The extensions' tools (the knowledge base's, the sources').
      ...Object.assign({}, ...added.map((contribution) => contribution.mcpServers ?? {})),
      // The date and date arithmetic, in every session and mode: only reads (tools/time.ts).
      time: createTimeServer(config.timeZone),
    },
    hooks: {
      PreToolUse: [
        { hooks: [transcriptLogger.preToolUse] },
        ...(fileTools.length || toolOnlyDirs.length
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
                    toolOnlyDirs,
                  }),
                ] }]
          : []),
        // Registered wherever the approval tool is, and asking only while the current mode is
        // "interactive": a guided session can switch to interactive and back (ModeControl).
        ...(includeApprovalTool ? [{ hooks: [createStepGate(runDir, () => modeControl.mode === "interactive", fromExtensions((contribution) => contribution.selfAskingTools))] }] : []),
        // Likewise for "plan", which any non-autonomous session can switch into: the agent
        // only reads and plans while it's on (hooks/planGate.ts).
        ...(includeApprovalTool
          ? [
              {
                hooks: [
                  createPlanGate(
                    {
                      projectDir: config.projectDir,
                      readOnlyTools: fromExtensions((contribution) => contribution.readOnlyTools),
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

  // The extensions' own hooks (the memory hears the person's messages), after the kit's.
  for (const contribution of added) {
    for (const [event, matchers] of Object.entries(contribution.hooks ?? {}) as [HookEvent, HookCallbackMatcher[]][]) {
      sdkOptions.hooks![event] = [...(sdkOptions.hooks![event] ?? []), ...matchers];
    }
  }

  const toolLabels: ToolLabels = Object.assign({}, ...added.map((contribution) => contribution.toolLabels ?? {}));
  const extensions: ExtensionsStatus = {
    dirs: extensionDirs,
    installed: await listInstalled(extensionDirs),
    active: resolved.active.map(({ extension }) => extension.name),
    about: Object.fromEntries(resolved.active.map(({ extension, manifest }) => [extension.name, { description: manifest.description, provides: manifest.provides }])),
    inactive: resolved.inactive,
  };
  // What the session is, for the extensions that ask (sessionFacts.ts, #43).
  late.view = createSessionView(
    {
      ...(spec.identity ? { identity: spec.identity } : {}),
      kitVersion: agentKitVersion(),
      language,
      extensions: {
        active: resolved.active.map(({ extension, manifest }, index) => ({
          name: extension.name,
          description: manifest.description,
          provides: manifest.provides,
          servers: Object.keys(added[index]?.mcpServers ?? {}),
          help: added[index]?.helpLines ?? [],
        })),
        inactive: resolved.inactive,
      },
      subagents: Object.entries(allAgents).map(([name, agent]) => ({ name, description: agent.description })),
      skills: sdkOptions.skills === "all" ? await pluginSkills(pluginRoots) : [...((sdkOptions.skills as string[] | undefined) ?? [])],
      runDir,
    },
    modeControl,
  );
  registerSessionView(sdkOptions, late.view);
  const apis = Object.fromEntries(resolved.active.flatMap(({ extension }, index) => (added[index]?.api ? [[extension.name, added[index]!.api!]] : [])));
  return { options: sdkOptions, transcriptLogger, transcriptPath, modeControl, language, toolLabels, extensions, apis, ...(knowledgeStore ? { knowledgeStore } : {}) };
}

export { createModeControl, togglePlanMode, type ModeControl } from "./modeControl.js";

/** The extensions of a session: where they're installed, what's installed, what runs and what can't (with why). */
export interface ExtensionsStatus {
  dirs: ExtensionDirs;
  installed: InstalledExtension[];
  /** The names of the extensions this session runs with, the kit's and the agent's too. */
  active: string[];
  /** What each active one is, from its manifest: for a view that lists them. */
  about: Record<string, { description: string; provides: string[] }>;
  inactive: { name: string; reason: string }[];
}

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

/** The built-in file tools, in the order the session lists them. */
const FILE_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep"];

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

function skillList(skills: string[] | "all" | undefined, added: readonly string[], leftOut: readonly string[]): string[] | "all" {
  if (skills === undefined || skills === "all") return "all";
  return [...new Set([...skills, ...added])].filter((skill) => !leftOut.includes(skill));
}

/** The project's own skills (`<projectDir>/.claude/skills/<name>/SKILL.md`), by name. */
async function projectSkills(projectDir: string): Promise<string[]> {
  const folders = await readdir(path.join(projectDir, ".claude", "skills"), { withFileTypes: true }).catch(() => []);
  return folders.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
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
