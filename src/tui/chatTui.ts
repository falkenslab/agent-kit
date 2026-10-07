import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type { ModeControl } from "../core/session.js";
import type { AgentEvent } from "../core/runner.js";
import { isSharedQuestionActive, setSharedReadline } from "./terminalInteraction.js";
import * as ui from "./ui.js";
import { t } from "../core/messages/index.js";
import { applyLanguage } from "./language.js";
import { applyTheme, type Theme } from "./theme.js";
import { createConsoleRenderer } from "./consoleRenderer.js";
import type { ToolLabels } from "../core/toolLabels.js";
import { runDate, type SessionOpener } from "../chat/runs.js";
import { createChatController, type NoticeTone } from "../chat/chatController.js";

export { capHistory, loadHistory, saveHistory, slashCommandToken } from "../chat/history.js";

/** Options of the chats (`runChatTui()`, and `runChatInk()` through `InkChatOptions`). */
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
  /**
   * Shown once per turn, right before the agent's streamed reply text starts (not before
   * any action lines that precede it) — and, when set, also colors that reply text via
   * `ui.agent()`. Pass a pre-colored string (e.g. `ui.agent("Captain Whiskers>")`); omit to
   * keep the plain, unlabeled/uncolored text streaming this kit had before.
   */
  agentLabel?: string;
  /** Lines (trimmed, case-insensitive) that end the chat. */
  exitCommands?: readonly string[];
  /**
   * When set, submitted as the very first turn — before the human is ever prompted —
   * exactly as if they'd typed it themselves (mirrored to `sessionLogPath`/history like
   * any other line). For an agent that should act proactively at the start of a chat (log
   * into a site, load some state) instead of sitting idle at the prompt until the human
   * says something first. Omit for the plain "wait at the prompt" behavior this kit had
   * before.
   */
  initialPrompt?: string;
  /**
   * When set, mirrors everything this loop prints — the welcome message, each prompt
   * line the human types, the agent's streamed reply, action lines, and any error/warning
   * — into this file as it happens (appended, plain text with ANSI color codes stripped),
   * so a session leaves behind an exact, always-present transcript of what the terminal
   * showed even when the agent never calls a single tool (unlike `transcriptPath` from
   * `buildSessionOptions()`, which only gets written to on the first tool call). Omit to
   * skip session logging entirely. With `runsDir`, the run's own `session.log` is used instead.
   */
  sessionLogPath?: string;
  /**
   * When set, every non-empty line the human submits (including exit commands — a shell's
   * own history keeps those too) is appended here as one JSON object per line
   * (`{ text: string, timestamp: string }`, ISO 8601), trimmed to the most recent
   * `historyLimit` entries (oldest dropped first). Loaded back at startup — including
   * across separate runs of the same agent, since this path is normally a fixed file, not
   * one under a per-run timestamped directory — into `readline`'s own history, so ↑/↓ at
   * the prompt cycles through prior prompts. Omit to skip persistence entirely (↑/↓ still
   * works for the current session alone, via readline's own in-memory default).
   */
  historyPath?: string;
  /** Max entries kept in `historyPath` (and in the in-session ↑/↓ list). Defaults to 100. */
  historyLimit?: number;
  /**
   * The language of the kit's texts ("en", "es", "fr", "de"). `--language=<code>` on the
   * command line wins; without either, the one `buildSessionOptions()` chose from
   * `config.language`, or else the system's.
   */
  language?: string;
  /**
   * The agent's runs folder, with a session opener in place of the options (e.g.
   * `(run) => buildSessionOptions(config, run.dir, spec, { run })`): each run gets its own
   * folder (`<runsDir>/<timestamp>/`) keeping its conversation, its session log
   * (`session.log`, instead of `sessionLogPath`) and its transcript, and can be resumed:
   * `--continue` on the command line starts with the latest run, and `/resume` lists them
   * (date and the human's last message) to switch to one. The runs folder holds the whole
   * conversation, tool results included and not redacted: keep it out of version control.
   */
  runsDir?: string;
  /**
   * The session's mode control (`buildSessionOptions()` returns it): `/plan` switches into
   * plan mode and back (an autonomous session can't switch), and entering or leaving plan
   * mode is told to the model with the next message. With a session opener, the one it
   * returns is used instead.
   */
  modeControl?: ModeControl;
  /**
   * How the chat shows the extensions' tools (`buildSessionOptions()` returns them as
   * `toolLabels`), before `formatAction`. With a session opener, the ones it returns are used
   * instead.
   */
  toolLabels?: ToolLabels;
  /**
   * Colors for the kit's roles (see `Theme`), on top of the kit's defaults: only the roles
   * given change, e.g. `{ toolResult: "yellow", selection: "#00ff00" }`. One theme per
   * process: without this option, the one already set stays.
   */
  theme?: Partial<Theme>;
}

const DEFAULT_PROMPT_LABEL = "\n> ";
const DEFAULT_EXIT_COMMANDS: readonly string[] = ["/exit", "/quit"];
const DEFAULT_HISTORY_LIMIT = 100;

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
 * manual-login tools — see terminalInteraction.ts) prompts on the same interface instead of a
 * second one fighting it for stdin's raw mode.
 *
 * Takes the SDK `Options` produced by `buildSessionOptions()` rather than an `AgentSpec`
 * directly, so it stays reusable for an `Options` assembled any other way:
 *
 *   const { options } = await buildSessionOptions(config, runDir, spec);
 *   await runChatTui(options, { welcomeMessage: "Ready. Type /exit to quit." });
 *
 * or, to keep each run's conversation in its folder and resume it (see `runsDir`):
 *
 *   await runChatTui((run) => buildSessionOptions(config, run.dir, spec, { run }), { runsDir });
 *
 * Resolves once the chat ends (an exit command, Ctrl+C/Ctrl+D at an idle prompt) — this
 * function owns the whole session lifecycle, closing the underlying query and readline
 * interface itself before returning.
 */
export async function runChatTui(options: Options | SessionOpener, tuiOptions: ChatTuiOptions = {}): Promise<void> {
  applyLanguage(tuiOptions.language);
  applyTheme(tuiOptions.theme);
  const promptLabel = tuiOptions.promptLabel ?? DEFAULT_PROMPT_LABEL;
  const historyLimit = tuiOptions.historyLimit ?? DEFAULT_HISTORY_LIMIT;

  // The readline interface and its writer, set below once the history it starts with is loaded.
  const late = {} as { rl: readline.Interface; writeLine: (text: string) => void };
  const controller = await createChatController(options, {
    exitCommands: tuiOptions.exitCommands ?? DEFAULT_EXIT_COMMANDS,
    initialPrompt: tuiOptions.initialPrompt,
    sessionLogPath: tuiOptions.sessionLogPath,
    promptLabel,
    agentLabel: tuiOptions.agentLabel,
    historyPath: tuiOptions.historyPath,
    historyLimit,
    runsDir: tuiOptions.runsDir,
    modeControl: tuiOptions.modeControl,
    toolLabels: tuiOptions.toolLabels,
    formatAction: tuiOptions.formatAction,
    // Nothing here shows them.
    promptSuggestions: false,
    // /resume: a numbered list, and a number typed.
    async pick(title, choices) {
      late.writeLine(ui.heading(title));
      choices.forEach((choice) => late.writeLine(`  ${choice.label}`));
      const answer = (await late.rl.question(t().resumeQuestion)).trim();
      return choices[Number(answer) - 1]?.value ?? null;
    },
  });

  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    // readline wants most-recent-first (↑ shows the newest entry first); the history is oldest-first.
    history: [...controller.getState().history].reverse(),
    historySize: historyLimit,
  });
  setSharedReadline(rl);

  // Every write goes through the shared console renderer (./consoleRenderer.ts), which
  // tracks whether the cursor sits at the start of a line and never emits a blank line
  // between consecutive action lines. The session log is the controller's.
  const renderer = createConsoleRenderer({
    formatAction: controller.formatAction,
    agentLabel: tuiOptions.agentLabel,
    output: (text) => void stdout.write(text),
    onWrite: () => {
      // node:readline's `Interface` tracks, on itself, how many terminal rows its own last
      // rendered prompt+line took (`prevRows`), so that the *next* time it redraws (the next
      // `rl.question()` for the following turn, but — confirmed empirically — also any
      // ordinary keystroke typed ahead while a long reply is still streaming here, since the
      // interface keeps listening to stdin the whole time, not just while a `question()` is
      // pending) it knows how far to move the cursor up before clearing. Every write this
      // function makes happens outside readline entirely, so that bookkeeping goes stale the
      // moment we print anything — left uncorrected, that next redraw moves the cursor up by
      // the stale (small/zero) row count from wherever it *actually* is now (the bottom of
      // everything just written) and clears from there down, visibly eating the tail of a
      // short reply (or, for a long one the user started typing over), a chunk out of its
      // middle. `prevRows` isn't part of readline's public/typed API, but it *is* a plain,
      // externally-settable instance property at runtime (not a real JS `#private` field) —
      // resetting it to 0 after every write of our own keeps that bookkeeping honest right up
      // to the moment readline's own logic (ours or a stray keystroke's) needs it next, so
      // the cursor-up step is always a no-op and the clear only ever touches blank space
      // below the real cursor.
      (rl as unknown as { prevRows?: number }).prevRows = 0;
    },
  });
  const { writeLine } = renderer;
  Object.assign(late, { rl, writeLine });

  const toned = (text: string, tone: NoticeTone): string => (tone === "plain" ? text : tone === "dim" ? ui.dim(text) : tone === "warn" ? ui.warn(text) : ui.error(text));
  controller.onEvent((event) => {
    switch (event.type) {
      case "agent":
        if (event.event.type !== "prompt-suggestion") renderer.render(event.event);
        return;
      case "notice":
        writeLine(toned(event.text, event.tone));
        return;
      case "turn-start":
        renderer.startTurn();
        return;
      case "turn-end":
        // Every turn ends on a fresh row, so readline's redraw only ever clears blank space.
        renderer.endLine();
        return;
      case "conversation":
        for (const message of event.messages) {
          // Printed, not logged: the run's session log already has it.
          stdout.write(message.role === "user" ? `${promptLabel}${message.text}\n` : `\n${tuiOptions.agentLabel ? `${tuiOptions.agentLabel} ` : ""}${message.text}\n`);
        }
        writeLine(ui.dim(`\n${t().resumed(runDate(event.updatedAt))}`));
        return;
      case "mode":
        // The mode changed (/plan, or the agent leaving plan mode with present_plan): say so.
        writeLine(ui.dim(`⏵⏵ ${t().mode(event.mode)}`));
        return;
      case "user":
      case "session":
        return; // readline already echoed the line; nothing to draw for a reopened session
    }
  });

  rl.on("SIGINT", () => {
    if (controller.getState().busy) controller.interrupt();
    else rl.close();
  });
  // Esc interrupts the turn in flight too, like Ctrl+C — but, unlike it, never ends the
  // chat, and does nothing while a human-in-the-loop checkpoint is asking on this same
  // interface (Esc there is just a keystroke on the question). The readline interface
  // already emits "keypress" on stdin, and only reports name "escape" for a lone Esc, not
  // for the Esc-prefixed sequences of arrow/function keys.
  const onKeypress = (_chunk: string | undefined, key: { name?: string } | undefined): void => {
    if (key?.name === "escape" && controller.getState().busy && !isSharedQuestionActive()) controller.interrupt();
  };
  stdin.on("keypress", onKeypress);

  if (tuiOptions.welcomeMessage) controller.notice(tuiOptions.welcomeMessage, "plain");

  try {
    await controller.start();
    while (true) {
      let line: string;
      try {
        line = await rl.question(promptLabel);
      } catch {
        break; // the interface closed underneath us (SIGINT/EOF while idle)
      }
      if ((await controller.send(line)) === "exit") break;
    }
  } finally {
    stdin.off("keypress", onKeypress);
    controller.close();
    setSharedReadline(null);
    rl.close();
  }
}
