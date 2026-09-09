import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { createInputQueue } from "../session.js";
import { runQuery, type AgentEvent } from "../runner.js";
import { createFriendlyToolLabel } from "../toolLabels.js";
import { setSharedReadline } from "../hooks/sharedReadline.js";
import * as ui from "./ui.js";

export interface ChatTuiOptions {
  /**
   * Turns a tool call into a one-line console label. Defaults to `createFriendlyToolLabel()`
   * with no domain overrides — pass your own (e.g.
   * `createFriendlyToolLabel({ describe, extraLocalServers })`) to cover a concrete agent's
   * own domain-specific tools (Playwright's `browser_*`, etc.).
   */
  formatAction?: (toolName: string, input: unknown) => string;
  /** Printed once before the first prompt, if given. */
  welcomeMessage?: string;
  /** Shown before the cursor at each prompt. */
  promptLabel?: string;
  /** Lines (trimmed, case-insensitive) that end the chat. */
  exitCommands?: readonly string[];
}

const DEFAULT_PROMPT_LABEL = "\n> ";
const DEFAULT_EXIT_COMMANDS: readonly string[] = ["/exit", "/quit"];

/**
 * Reads `events` one turn at a time — up to and including a `turn-end` — via manual
 * `.next()` calls, calling `onEvent` for each. Deliberately never uses
 * `for await...of` + `break`: `run.events` (see runner.ts) is one long-lived generator
 * spanning the *whole* multi-turn session, not one per turn, and breaking out of a
 * `for-await-of` loop calls the generator's `.return()`, permanently closing it — the next
 * turn's drain would then see `done: true` immediately and silently lose the rest of the
 * conversation. Exported on its own (not part of the package's public API — see index.ts)
 * so this exact behavior has a direct regression test.
 */
export async function drainTurn(events: AsyncIterator<AgentEvent>, onEvent: (event: AgentEvent) => void): Promise<void> {
  while (true) {
    const { value, done } = await events.next();
    if (done) return;
    onEvent(value);
    if (value.type === "turn-end") return;
  }
}

/**
 * A ready-to-run interactive terminal chat loop, assembled from this kit's own chat
 * primitives: `createInputQueue()` feeds typed lines into a multi-turn `query()` session,
 * `runQuery()`'s normalized event stream is rendered to the console (streamed text,
 * friendly action labels via `createFriendlyToolLabel()`, turn failures), and this loop's
 * own `readline.Interface` is registered via `setSharedReadline()` so any human-in-the-loop
 * checkpoint the session hits (the interactive-mode step gate, or the guided-mode approval/
 * manual-login tools — see hooks/humanInput.ts) prompts on the same interface instead of a
 * second one fighting it for stdin's raw mode.
 *
 * Takes the SDK `Options` produced by `buildSessionOptions()` rather than an `AgentSpec`
 * directly, so it stays reusable for an `Options` assembled any other way:
 *
 *   const { options } = await buildSessionOptions(config, runDir, spec);
 *   await runChatTui(options, { welcomeMessage: "Ready. Type /exit to quit." });
 *
 * Resolves once the chat ends (an exit command, Ctrl+C/Ctrl+D at an idle prompt) — this
 * function owns the whole session lifecycle, closing the underlying query and readline
 * interface itself before returning.
 */
export async function runChatTui(options: Options, tuiOptions: ChatTuiOptions = {}): Promise<void> {
  const formatAction = tuiOptions.formatAction ?? createFriendlyToolLabel();
  const exitCommands = new Set((tuiOptions.exitCommands ?? DEFAULT_EXIT_COMMANDS).map((c) => c.toLowerCase()));
  const promptLabel = tuiOptions.promptLabel ?? DEFAULT_PROMPT_LABEL;

  const queue = createInputQueue();
  const run = runQuery(queue.iterable, options);
  const events = run.events[Symbol.asyncIterator]();

  const rl = readline.createInterface({ input: stdin, output: stdout });
  setSharedReadline(rl);

  let turnInFlight = false;
  rl.on("SIGINT", () => {
    if (turnInFlight) {
      void run.interrupt();
      console.log(ui.warn("\n(interrupted)"));
    } else {
      queue.end();
      rl.close();
    }
  });

  if (tuiOptions.welcomeMessage) console.log(tuiOptions.welcomeMessage);

  try {
    while (true) {
      let line: string;
      try {
        line = (await rl.question(promptLabel)).trim();
      } catch {
        break; // the interface closed underneath us (SIGINT/EOF while idle)
      }

      if (!line) continue;
      if (exitCommands.has(line.toLowerCase())) break;

      queue.push(line);
      turnInFlight = true;
      await drainTurn(events, renderEvent);
      turnInFlight = false;
    }
  } finally {
    queue.end();
    run.close();
    setSharedReadline(null);
    rl.close();
  }

  function renderEvent(event: AgentEvent): void {
    switch (event.type) {
      case "text":
        stdout.write(event.text);
        return;
      case "action":
        console.log(ui.action(`\n${formatAction(event.toolName, event.input)}`));
        return;
      case "mcp-error":
        console.log(ui.warn(`Some MCP servers failed to connect: ${event.failedServers.join(", ")}`));
        return;
      case "turn-end":
        if (event.failed) console.log(ui.error(`\n${event.errorText}`));
        return;
    }
  }
}
