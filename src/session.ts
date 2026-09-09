import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createTranscriptLogger, type TranscriptLogger } from "./hooks/transcriptLogger.js";
import { createStepGate } from "./hooks/stepGate.js";
import { createSubagentBashGate } from "./hooks/subagentBashGate.js";
import { createSubagentTypeGate } from "./hooks/subagentTypeGate.js";
import { createSubagentForegroundGate } from "./hooks/subagentForegroundGate.js";
import { createHumanApprovalServer } from "./tools/humanApproval.js";
import { createManualLoginServer } from "./tools/manualLogin.js";
import { createSaveToKnowledgeServer } from "./tools/saveToKnowledge.js";
import { allowAnyMcpTool } from "./mcpPermissions.js";
import type { AgentSpec, BaseSessionConfig } from "./agentSpec.js";

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
 * exist, whether the interactive step gate hook runs) all fall out of `config.mode`
 * alone — "chat" behaves exactly like "guided" here (approval tool always on, no step
 * gate), so there's no separate chat-specific branch to maintain.
 */
export async function buildSessionOptions<TConfig extends BaseSessionConfig>(
  config: TConfig,
  runDir: string,
  spec: AgentSpec<TConfig>,
  options: { autoCompactEnabled?: boolean } = {},
): Promise<{ options: Options; transcriptLogger: TranscriptLogger; transcriptPath: string }> {
  const { mode } = config;

  // The human approval server only exists outside autonomous mode: the point of
  // autonomous is that the agent has no channel to ask for human intervention at all.
  const includeApprovalTool = mode !== "autonomous";
  // Available as a safety net except in autonomous (checked above) or --headless (no
  // visible window for a human to act on it) — useful both when there's no configured
  // way to complete a step and when there is one but it fails unexpectedly.
  const includeManualLoginTool = mode !== "autonomous" && !config.headless;
  // context/knowledge/skills only exist when this config has a project directory of its
  // own (as opposed to a config-less/legacy invocation).
  const includeFileTools = Boolean(config.contextDir);
  // Whatever opt-in subagents `spec` wants for this config, or undefined if none apply.
  // Either opt-in feature needs the Agent tool (to delegate to a subagent) and Bash (used
  // only by the subagent itself — see createSubagentBashGate() below, which denies Bash
  // to the main agent regardless of which one put it in `tools`) — Bash has to be present
  // in this session's own tools for any subagent to be allowed to use it at all
  // (confirmed empirically the SDK refuses to spawn a subagent whose own tools list names
  // anything not already present here — which is why the hook, not just omitting "Bash"
  // from this list, is what actually confines it to subagent use).
  const subagents = spec.buildSubagents(config);
  const includeSubagentTools = subagents !== undefined;
  // The exact set of subagent_type values the Agent tool may spawn in this session — see
  // createSubagentTypeGate() below for why this can't just be "whatever's in `agents`
  // below": the SDK's own built-in "general-purpose" type is spawnable regardless of that
  // map, and inherits the full session tools (Bash included) rather than the narrow list
  // each declared subagent actually declares.
  const allowedSubagentTypes = subagents?.allowedSubagentTypes ?? [];

  const transcriptPath = path.join(runDir, "transcript.jsonl");
  const transcriptLogger = createTranscriptLogger(transcriptPath, config.secrets ?? []);

  const sdkOptions: Options = {
    systemPrompt: spec.buildSystemPrompt(config),
    settings: { autoCompactEnabled: options.autoCompactEnabled ?? true },
    // No built-in tools except, if applicable, Read/Write/Glob restricted to the
    // project's context/knowledge (additionalDirectories, below), and WebFetch/WebSearch
    // with no domain restriction (not conditioned on includeFileTools: it's read-only,
    // doesn't depend on there being a project directory) — any priority order between
    // them is the domain's own system prompt's job to establish, not this function's.
    tools: [...(includeFileTools ? ["Read", "Write", "Glob"] : []), "WebFetch", "WebSearch", ...(includeSubagentTools ? ["Agent", "Bash"] : [])],
    allowedTools: [...(includeFileTools ? ["Read", "Write", "Glob"] : []), "WebFetch", "WebSearch", ...(includeSubagentTools ? ["Agent", "Bash"] : [])],
    // Every mcp__* tool (whatever spec.buildMcpServers() registers, approvals/manualLogin
    // when enabled below, knowledgeFiles, and any server a project's own .mcp.json
    // declares) is approved generically here rather than listed one by one — see
    // mcpPermissions.ts for why a fixed allowedTools wildcard can't cover a server whose
    // name isn't known ahead of time.
    canUseTool: allowAnyMcpTool,
    disallowedTools: spec.disallowedTools ?? [],
    // Real text streaming instead of silently waiting for the turn's complete message —
    // see the caller's message loop.
    includePartialMessages: true,
    ...(includeFileTools
      ? {
          // With cwd pointing at the project, the SDK's own "project settings" discovery
          // finds <project>/.claude/skills/ on its own — the user's own custom
          // skills, on top of the plugin-provided built-ins from spec.pluginRoots()
          // below. skipMcpDiscovery: true on those plugins is the caller's choice.
          cwd: config.projectDir,
          additionalDirectories: [config.contextDir, config.knowledgeDir].filter((d): d is string => Boolean(d)),
          // "skills" acts as a name whitelist, not an addition: "all" enables both the
          // SDK's own official skills (pdf/docx), the project's own custom ones, and the
          // plugin-provided built-ins below.
          skills: "all",
          plugins: spec.pluginRoots(config).map((pluginPath) => ({ type: "local" as const, path: pluginPath, skipMcpDiscovery: true })),
        }
      : {}),
    maxTurns: 400,
    ...(subagents ? { agents: subagents.agents } : {}),
    mcpServers: {
      ...spec.buildMcpServers(config, runDir),
      ...(includeApprovalTool ? { approvals: createHumanApprovalServer(runDir, spec.humanApprovalTexts) } : {}),
      ...(includeManualLoginTool ? { manualLogin: createManualLoginServer(runDir, spec.manualInterventionTexts) } : {}),
      ...(includeFileTools && config.contextDir && config.knowledgeDir
        ? { knowledgeFiles: createSaveToKnowledgeServer(runDir, config.contextDir, config.knowledgeDir, spec.saveToKnowledgeDescription) }
        : {}),
    },
    hooks: {
      PreToolUse: [
        { hooks: [transcriptLogger.preToolUse] },
        ...(mode === "interactive" ? [{ hooks: [createStepGate(runDir)] }] : []),
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

  return { options: sdkOptions, transcriptLogger, transcriptPath };
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
 */
export function createInputQueue(): {
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
      pending.push(text);
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
