import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { askForChoice } from "./humanInput.js";
import type { Mode } from "../agentSpec.js";
import { readLock, setExtensionConfirm, type LockEntry } from "../externalExtensions.js";
import { t } from "../messages/index.js";
import type { ToolLabels } from "../toolLabels.js";

/** An installed extension whose tools the guided gate watches. */
export interface GuardedExtension {
  name: string;
  /** Its scope's folder: its lock keeps what the person said about its tools. */
  scopeDir: string;
  /** Its MCP servers, by session name. */
  servers: readonly string[];
  /** Its tools that always ask (full names): its manifest's `confirmTools` and the agent's own list. */
  confirmTools: readonly string[];
  /** Its tools whose server asks the person itself (full names, the manifest's `serverConfirmTools`, #77). */
  serverConfirmTools?: readonly string[];
}

/** One answer the gate gave, for the transcript: what was asked, and what the person (or the mode) said. */
export interface GuidedDecision {
  extension: string;
  tool: string;
  answer: "yes" | "session" | "always" | "no" | "never" | "kept-never" | "autonomous-deny" | "server-asks";
}

/** The guided gate: its `PreToolUse` hook, and what ends or starts an approved batch. */
export interface GuidedGate {
  preToolUse: HookCallback;
  /** A `UserPromptSubmit` hook: the person's next message ends an approved batch. */
  userPromptSubmit: HookCallback;
  /** `request_human_approval`'s answer: approved, the calls that follow don't ask until the person's next message. */
  approvalAnswered(approved: boolean): void;
}

/** How much of a labelled tool's parameters its panel shows, as one line (#84). */
const MAX_PARAMETERS = 300;

/** The kit's approval tool: asking it ends a batch, and its yes starts one. */
const APPROVAL_TOOL = "mcp__approvals__request_human_approval";

/**
 * Guided mode's gate for installed extensions' tools that change things (#74, #76): ADR-025 treats
 * every extension tool as publishing unless it's known to only read, and in guided mode the person
 * says yes before one runs, whatever the model did first. The step gate covers interactive mode
 * (it asks before everything) and the plan gate plan mode (it denies), so this one decides only in
 * guided and autonomous mode, where no one can be asked and `autonomous` says what happens.
 *
 * Read-only tools (the manifest's `readOnlyTools`, else the server's `readOnlyHint`) never ask.
 * The rest ask through the interaction port, with answers the person can make last: this call,
 * this session, always (kept in the extension's lock), no, never (kept too). Right after
 * `request_human_approval` is approved, calls go on until the person's next message (a batch),
 * except those that always ask: the agent's or the manifest's `confirmTools`, else the server's
 * `destructiveHint`, asked on every call, so they're offered only yes, no and never (#78). An extension whose lock says `off`
 * runs without asking. A tool whose server asks the person itself (`serverConfirmTools`, #77)
 * isn't asked about too in guided mode, where that question reaches the person: one question,
 * the server's. Approving gives no decision of its own, so the other gates still judge.
 */
export function createGuidedGate(options: {
  runDir: string;
  mode: () => Mode;
  extensions: readonly GuardedExtension[];
  /** Whether a tool only reads: the extensions' `readOnlyTools`, else their servers' hints. */
  isReadOnly(tool: string): Promise<boolean>;
  /** Whether a tool's server marks it `destructiveHint`, for those whose manifest lists no `confirmTools`. */
  isDestructive(tool: string): Promise<boolean>;
  /** In autonomous mode, where no one can be asked: denied (the default) or run. */
  autonomous?: "deny" | "allow";
  /** The tools' labels in the session's language, to say what's about to happen. */
  labels?: () => ToolLabels;
  /** Each answer, for the transcript. */
  record?(decision: GuidedDecision): Promise<void>;
}): GuidedGate {
  const thisSession = new Set<string>();
  let batch = false;
  const deny = (input: PreToolUseHookInput, reason: string) => ({ hookSpecificOutput: { hookEventName: input.hook_event_name, permissionDecision: "deny" as const, permissionDecisionReason: reason } });

  const preToolUse: HookCallback = async (input) => {
    const pre = input as PreToolUseHookInput;
    const full = pre.tool_name;
    // A new approval request ends the batch the last one started, whatever its answer.
    if (full === APPROVAL_TOOL) batch = false;
    const mode = options.mode();
    if (mode !== "guided" && mode !== "autonomous") return {};
    const server = options.extensions.flatMap((extension) => extension.servers.map((name) => ({ extension, prefix: `mcp__${name}__` }))).find(({ prefix }) => full.startsWith(prefix));
    if (!server) return {};
    const { extension } = server;
    const tool = full.slice(server.prefix.length);
    if (await options.isReadOnly(full)) return {};
    const confirm = (await readLock(extension.scopeDir).catch((): Record<string, LockEntry> => ({})))[extension.name]?.confirm;
    if (confirm?.off) return {};
    const record = async (answer: GuidedDecision["answer"]) => await options.record?.({ extension: extension.name, tool: full, answer }).catch(() => {});
    const kept = confirm?.tools?.[tool];
    if (kept === "never") {
      await record("kept-never");
      return deny(pre, `The person never lets ${extension.name} run ${tool} (they said so before). Don't call it again: do the task another way, or tell them it needs it.`);
    }
    // Its server asks the person itself, and in guided mode its question reaches them (#77).
    if (mode === "guided" && extension.serverConfirmTools?.includes(full)) {
      await record("server-asks");
      return {};
    }
    const alwaysAsks = extension.confirmTools.includes(full) || (await options.isDestructive(full));
    // A tool that always asks is asked on every call (#78): no kept "always", no "this session".
    if (!alwaysAsks && (kept === "always" || thisSession.has(full))) return {};
    if (mode === "autonomous") {
      if (options.autonomous === "allow") return {};
      await record("autonomous-deny");
      return deny(pre, `Autonomous mode: no one can approve ${extension.name}'s ${tool}, which changes things, so it isn't run. Do what you can without it, and say it needs a person to approve it.`);
    }
    if (batch && !alwaysAsks) return {};

    const answers = t().confirmAnswers;
    // For one that always asks, only what covers this call, or makes it stricter (#78).
    const choices = alwaysAsks ? [answers.yes, answers.no, answers.never] : [answers.yes, answers.session, answers.always, answers.no, answers.never];
    const label = options.labels?.()[full]?.label((pre.tool_input ?? {}) as Record<string, unknown>);
    // With a label saying what it does, its parameters in one line, cut short (#84): a rubric or a
    // page's HTML as indented JSON filled the panel. Without one, the parameters are all it shows.
    const compact = JSON.stringify(pre.tool_input ?? {});
    const parameters = label ? (compact.length > MAX_PARAMETERS ? `${compact.slice(0, MAX_PARAMETERS)}…` : compact) : JSON.stringify(pre.tool_input, null, 2);
    const answer = await askForChoice(options.runDir, {
      title: t().guidedTitle(extension.name),
      lines: [...(label ? [label] : []), t().toolLine(full), t().parametersLine(parameters)],
    }, choices);
    const picked = answer.chosen[0];
    if (picked === answers.yes || picked === answers.session || picked === answers.always) {
      if (picked === answers.session) thisSession.add(full);
      if (picked === answers.always) await setExtensionConfirm(extension.scopeDir, extension.name, { tool: { name: tool, answer: "always" } });
      await record(picked === answers.yes ? "yes" : picked === answers.session ? "session" : "always");
      return {};
    }
    if (picked === answers.never) {
      await setExtensionConfirm(extension.scopeDir, extension.name, { tool: { name: tool, answer: "never" } });
      await record("never");
      return deny(pre, `The person never lets ${extension.name} run ${tool}. Don't call it again: do the task another way, or tell them it needs it.`);
    }
    await record("no");
    return deny(pre, `The person didn't approve this call${answer.other ? `. They said: ${answer.other}` : ""}. Don't retry it without asking them first.`);
  };

  return {
    preToolUse,
    userPromptSubmit: async () => {
      batch = false;
      return {};
    },
    approvalAnswered(approved) {
      batch = approved;
    },
  };
}
