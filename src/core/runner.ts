import { query, type Options, type SDKUserMessage, type SlashCommand } from "@anthropic-ai/claude-agent-sdk";

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
  | { type: "action"; toolName: string; input: unknown }
  /** One or more MCP servers failed to connect at session startup. */
  | { type: "mcp-error"; failedServers: string[] }
  /** A turn (one full `query()` response cycle) has finished. `failed` is the real
   * failure signal — the SDK can report `status: "success"` even when the turn actually
   * failed on an API error (billing/access denied, etc.), with the real message landing
   * in `resultText` instead of `errorText` in that specific case (confirmed empirically:
   * an org-level access error came back as subtype "success", is_error: true, with the
   * real message in `result`) — check `failed`, not `status === "success"`. */
  | { type: "turn-end"; status: string; failed: boolean; resultText: string | null; errorText: string }
  /** Out-of-band text from the CLI loop itself, not from the model: local-command output
   * (e.g. built-in `/usage`) or an informational banner (hook feedback, an unrecognized
   * `/slash-command` notice, ...). Without this, those `system` messages fell through
   * `generateEvents()` unhandled — confirmed empirically: typing an unrecognized/
   * unnamespaced plugin slash command produced total silence (no text, no error, nothing),
   * because the SDK's own response to it arrives as exactly this message shape and this
   * module simply dropped it. */
  | { type: "info"; text: string; level: "info" | "notice" | "suggestion" | "warning" | "local-command" };

export interface AgentRun {
  /** Normalized events for this run — iterate with `for await`. */
  events: AsyncIterable<AgentEvent>;
  /** Interrupts the current turn (doesn't end the session — a caller wanting a full stop should also call `close()`). */
  interrupt: () => Promise<unknown>;
  /** Ends the session. No further events arrive after this; safe to call even if `events` is still being iterated elsewhere (e.g. from a SIGINT handler racing the main loop). */
  close: () => void;
  /** This session's own slash commands (skills doubling as typable commands, etc.) — only meaningful once the session has actually started (see the SDK's own `Query.supportedCommands()`). */
  supportedCommands: () => Promise<SlashCommand[]>;
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

  async function* generateEvents(): AsyncGenerator<AgentEvent> {
    for await (const message of result) {
      if (message.type === "system" && message.subtype === "init") {
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
        if (message.parent_tool_use_id !== null) continue;
        for (const block of message.message.content) {
          if (block.type === "tool_use") {
            yield { type: "action", toolName: block.name, input: block.input };
          }
        }
        continue;
      }

      if (message.type === "result") {
        const failed = message.is_error;
        const resultText = message.subtype === "success" ? message.result : null;
        const errorText = message.subtype === "success" ? message.result : message.errors.join("; ");
        yield { type: "turn-end", status: message.subtype, failed, resultText, errorText };
      }
    }
  }

  return {
    events: generateEvents(),
    interrupt: () => result.interrupt(),
    close: () => result.close(),
    supportedCommands: () => result.supportedCommands(),
  };
}
