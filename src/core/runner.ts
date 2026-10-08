import { query, type Options, type SDKUserMessage, type SlashCommand } from "@anthropic-ai/claude-agent-sdk";
import { sessionViewOf } from "./sessionFacts.js";

/**
 * A transport-agnostic view of one turn's worth of output from `query()` — the same
 * normalized shape whether the caller is going to print it to a console, forward it to a
 * chat REPL, or serialize it over Electron IPC (a real consuming agent had four
 * separate entry points — CLI run, CLI chat, an exploration mode and a desktop chat — that
 * all parsed the SDK's raw message stream themselves, nearly identically).
 *
 * Deliberately thin: no formatting (no "[agent]"/"[action]" prefixes, no friendly tool
 * labels — those are domain/presentation concerns the caller owns), and no filtering
 * beyond what's always correct regardless of caller (see `action` below).
 */
export type AgentEvent =
  /** One streamed text token from the agent's own reply. No separate "block started"
   * event: a caller that wants a prefix before a new run of text (e.g. "\n[agent] ") can
   * track "was the previous event also `text`?" itself — simpler than mirroring the SDK's
   * own content-block boundaries, and equivalent in practice. */
  | { type: "text"; text: string }
  /** A tool call the main agent itself made — never from inside a subagent's own private
   * turn (an `assistant` message with a non-null `parent_tool_use_id`, e.g. a subagent
   * spawned via the `Agent` tool): those are already reported back to the `Agent` tool
   * call that started them, so surfacing their *internal* tool use here would make it
   * look like a subagent had taken over the session, not just handed a result back to the
   * main agent. This filtering is the one piece of interpretation this module always
   * applies, since it's correct for every caller, not a presentation choice. */
  | { type: "action"; toolName: string; input: unknown; toolUseId?: string }
  /** A tool call made inside a subagent's own turn (see `action` above for why those are
   * kept apart). Only for showing that a subagent is busy: a console log ignores it. */
  | { type: "subagent-action"; toolName: string; input: unknown; toolUseId?: string; parentToolUseId?: string }
  /** What one of the main agent's tool calls returned, paired with its `action` by
   * `toolUseId`, as plain text (images and other non-text parts left out). Subagents'
   * results stay out, as their actions do. A console log ignores it. */
  | { type: "tool-result"; toolUseId: string; toolName: string; isError: boolean; text: string }
  /** One or more MCP servers failed to connect at session startup. */
  | { type: "mcp-error"; failedServers: string[] }
  /** A turn (one full `query()` response cycle) has finished. `failed` is the real
   * failure signal — the SDK can report `status: "success"` even when the turn actually
   * failed on an API error (billing/access denied, etc.), with the real message landing
   * in `resultText` instead of `errorText` in that specific case (confirmed empirically:
   * an org-level access error came back as subtype "success", is_error: true, with the
   * real message in `result`) — check `failed`, not `status === "success"`. */
  | { type: "turn-end"; status: string; failed: boolean; resultText: string | null; errorText: string; usage?: SessionUsage }
  /** Out-of-band text from the CLI loop itself, not from the model: local-command output
   * (e.g. built-in `/usage`) or an informational banner (hook feedback, an unrecognized
   * `/slash-command` notice, ...). Without this, those `system` messages fell through
   * `generateEvents()` unhandled — confirmed empirically: typing an unrecognized/
   * unnamespaced plugin slash command produced total silence (no text, no error, nothing),
   * because the SDK's own response to it arrives as exactly this message shape and this
   * module simply dropped it. */
  | { type: "info"; text: string; level: "info" | "notice" | "suggestion" | "warning" | "local-command" }
  /** The predicted next prompt, when `Options.promptSuggestions` is on. It arrives after
   * that turn's `turn-end`, so a reader that stops at `turn-end` sees it first thing in the
   * next turn; a console log ignores it. */
  | { type: "prompt-suggestion"; suggestion: string };

/**
 * Running totals for the whole `query()` session so far, not for one turn: the SDK's own
 * `total_cost_usd` and `modelUsage` are cumulative across turns in a streaming-input
 * session, so the latest `turn-end` carries the session total (never sum them).
 */
export interface SessionUsage {
  /** Input tokens, cache reads and writes included, across every model the session used. */
  inputTokens: number;
  /**
   * The part of `inputTokens` read from the cache: the context sent again on every call. It
   * grows with each call while the context barely does, so the chat shows it apart.
   */
  cacheReadTokens?: number;
  outputTokens: number;
  /** An estimate, not a billing statement. */
  costUsd: number;
}

/**
 * A turn's errors without the CLI's internal diagnostics: an interrupted turn ends with
 * one like "[ede_diagnostic] result_type=user ... stop_reason=tool_use" (seen on Esc),
 * which says nothing to a person.
 */
export function visibleErrors(errors: readonly string[]): string[] {
  return errors.filter((error) => !error.startsWith("[ede_diagnostic]"));
}

/** A tool result's content as plain text: its text parts joined, anything else skipped. */
export function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is { type: "text"; text: string } => typeof part === "object" && part !== null && part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/** How full the session's context window is (see `AgentRun.contextUsage()`). */
export interface ContextUsage {
  /** 0-100. */
  percentage: number;
  totalTokens: number;
  maxTokens: number;
}

/** A running session, as `runQuery()` returns it: its events and the controls of the SDK's `Query`. */
export interface AgentRun {
  /** Normalized events for this run — iterate with `for await`. */
  events: AsyncIterable<AgentEvent>;
  /** Interrupts the current turn (doesn't end the session — a caller wanting a full stop should also call `close()`). */
  interrupt: () => Promise<unknown>;
  /** Ends the session. No further events arrive after this; safe to call even if `events` is still being iterated elsewhere (e.g. from a SIGINT handler racing the main loop). */
  close: () => void;
  /** This session's own slash commands (skills doubling as typable commands, etc.) — only meaningful once the session has actually started (see the SDK's own `Query.supportedCommands()`). */
  supportedCommands: () => Promise<SlashCommand[]>;
  /** How full the context window is now, or null if the session can't tell (see the SDK's `Query.getContextUsage()`). */
  contextUsage: () => Promise<ContextUsage | null>;
}

/**
 * Thin wrapper around the SDK's own `query()`: same two-argument shape (a plain string
 * for a one-shot run, or an `AsyncIterable<SDKUserMessage>` — see `createInputQueue()` —
 * for a multi-turn chat), translating its raw message stream into `AgentEvent`s as
 * described above. Every other control surface of the underlying `Query` (`interrupt`,
 * `close`, `supportedCommands`) is passed through unchanged.
 */
export function runQuery(prompt: string | AsyncIterable<SDKUserMessage>, options: Options): AgentRun {
  const result = query({ prompt, options });
  // What the session is, for an extension that asks (sessionFacts.ts): the controls now, the
  // tools and skills when the session starts.
  const view = sessionViewOf(options);
  view?.attach({
    supportedCommands: () => result.supportedCommands(),
    contextUsage: () => contextUsage(),
    toggleMcpServer: (server, enabled) => result.toggleMcpServer(server, enabled),
    reloadPlugins: () => result.reloadPlugins(),
  });

  // The main agent's tool calls by id, to name the results that come back for them.
  const toolNames = new Map<string, string>();

  async function* generateEvents(): AsyncGenerator<AgentEvent> {
    for await (const message of result) {
      if (message.type === "system" && message.subtype === "init") {
        view?.attach({ tools: message.tools, skills: message.skills });
        const failedServers = message.mcp_servers.filter((s) => s.status === "failed").map((s) => s.name);
        if (failedServers.length > 0) yield { type: "mcp-error", failedServers };
        continue;
      }

      if (message.type === "system" && message.subtype === "informational") {
        yield { type: "info", text: message.content, level: message.level };
        continue;
      }

      if (message.type === "system" && message.subtype === "local_command_output") {
        yield { type: "info", text: message.content, level: "local-command" };
        continue;
      }

      if (message.type === "stream_event") {
        const event = message.event;
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", text: event.delta.text };
        }
        continue;
      }

      if (message.type === "assistant") {
        const type = message.parent_tool_use_id === null ? "action" : "subagent-action";
        for (const block of message.message.content) {
          if (block.type === "tool_use") {
            if (type === "action") toolNames.set(block.id, block.name);
            yield {
              type,
              toolName: block.name,
              input: block.input,
              toolUseId: block.id,
              ...(message.parent_tool_use_id === null ? {} : { parentToolUseId: message.parent_tool_use_id }),
            };
          }
        }
        continue;
      }

      if (message.type === "user" && message.parent_tool_use_id === null && Array.isArray(message.message.content)) {
        for (const block of message.message.content) {
          if (block.type !== "tool_result") continue;
          const toolName = toolNames.get(block.tool_use_id);
          if (!toolName) continue;
          yield { type: "tool-result", toolUseId: block.tool_use_id, toolName, isError: block.is_error === true, text: toolResultText(block.content) };
        }
      }

      if (message.type === "prompt_suggestion") {
        yield { type: "prompt-suggestion", suggestion: message.suggestion };
        continue;
      }

      if (message.type === "result") {
        const failed = message.is_error;
        const resultText = message.subtype === "success" ? message.result : null;
        const errorText = message.subtype === "success" ? message.result : visibleErrors(message.errors).join("; ");
        const models = Object.values(message.modelUsage ?? {});
        const usage: SessionUsage = {
          inputTokens: models.reduce((sum, m) => sum + m.inputTokens + m.cacheReadInputTokens + m.cacheCreationInputTokens, 0),
          cacheReadTokens: models.reduce((sum, m) => sum + m.cacheReadInputTokens, 0),
          outputTokens: models.reduce((sum, m) => sum + m.outputTokens, 0),
          costUsd: message.total_cost_usd,
        };
        yield { type: "turn-end", status: message.subtype, failed, resultText, errorText, usage };
      }
    }
  }

  return {
    events: generateEvents(),
    interrupt: () => result.interrupt(),
    close: () => result.close(),
    supportedCommands: () => result.supportedCommands(),
    contextUsage,
  };

  async function contextUsage(): Promise<ContextUsage | null> {
    try {
      const usage = await result.getContextUsage();
      return { percentage: usage.percentage, totalTokens: usage.totalTokens, maxTokens: usage.maxTokens };
    } catch {
      return null;
    }
  }
}
