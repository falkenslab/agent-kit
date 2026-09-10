import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createWriteStream, type WriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { createInputQueue } from "../session.js";
import { runQuery, type AgentEvent } from "../runner.js";
import { createFriendlyToolLabel } from "../toolLabels.js";
import { setSharedReadline } from "../hooks/sharedReadline.js";
import * as ui from "./ui.js";

// Only strips picocolors' own SGR sequences (`\x1b[<codes>m`) — the only kind this file
// ever writes to the console — not a general-purpose ANSI stripper for arbitrary escape
// sequences (cursor movement, OSC, ...) this kit never emits.
// eslint-disable-next-line no-control-regex -- \x1b is the ESC byte SGR sequences start with, not an accident
const ANSI_SGR = /\x1b\[[0-9;]*m/g;
function stripAnsi(text: string): string {
  return text.replace(ANSI_SGR, "");
}

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
   * When set, mirrors everything this loop prints — the welcome message, each prompt
   * line the human types, the agent's streamed reply, action lines, and any error/warning
   * — into this file as it happens (appended, plain text with ANSI color codes stripped),
   * so a session leaves behind an exact, always-present transcript of what the terminal
   * showed even when the agent never calls a single tool (unlike `transcriptPath` from
   * `buildSessionOptions()`, which only gets written to on the first tool call). Omit to
   * skip session logging entirely.
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
}

interface HistoryEntry {
  text: string;
  timestamp: string;
}

const DEFAULT_PROMPT_LABEL = "\n> ";
const DEFAULT_EXIT_COMMANDS: readonly string[] = ["/exit", "/quit"];
const DEFAULT_HISTORY_LIMIT = 100;

/** Keeps only the most recent `limit` entries (oldest-first order in, oldest-first out). */
export function capHistory(entries: readonly HistoryEntry[], limit: number): HistoryEntry[] {
  return entries.length > limit ? entries.slice(-limit) : entries.slice();
}

/** Oldest-first. Missing file reads as empty — nothing to load yet is the normal case. */
export async function loadHistory(filePath: string): Promise<HistoryEntry[]> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as HistoryEntry);
}

/** Overwrites the whole file (not appended) so a prior prune (oldest entries dropped) sticks. */
export async function saveHistory(filePath: string, entries: readonly HistoryEntry[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const body = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await writeFile(filePath, entries.length > 0 ? `${body}\n` : "", "utf8");
}

/**
 * The command name a typed line would invoke (e.g. "chiste" for both "/chiste" and
 * "/chiste con salsa"), or `null` for a line that isn't a slash command at all (doesn't
 * start with "/") or is just a bare "/" with nothing after it.
 */
export function slashCommandToken(line: string): string | null {
  if (!line.startsWith("/")) return null;
  const token = line.slice(1).split(/\s/, 1)[0];
  return token ? token : null;
}

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

  const historyLimit = tuiOptions.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  let historyEntries: HistoryEntry[] = tuiOptions.historyPath ? capHistory(await loadHistory(tuiOptions.historyPath), historyLimit) : [];

  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    // readline wants most-recent-first (↑ shows historyEntries' last/newest entry first);
    // this file is stored oldest-first (append-friendly, reads top-to-bottom like a log).
    history: historyEntries.map((entry) => entry.text).reverse(),
    historySize: historyLimit,
  });
  setSharedReadline(rl);

  const sessionLog: WriteStream | null = tuiOptions.sessionLogPath ? createWriteStream(tuiOptions.sessionLogPath, { flags: "a" }) : null;
  // Mirrors to the log file only — for text already visible on the terminal some other
  // way (readline's own prompt + the human's local echo), so it isn't printed twice.
  function mirror(text: string): void {
    sessionLog?.write(stripAnsi(text));
  }
  // Prints to the console *and* mirrors to the log file — the normal case for anything
  // this loop itself puts on screen (streamed reply text, action/error lines, ...).
  // Tracks whether the terminal cursor currently sits at column 0 of a fresh row — true
  // right after any write ending in "\n" (writeLine's normal case), false right after a
  // streamed text delta that doesn't (the common case: deltas rarely end mid-sentence on a
  // newline). Confirmed empirically (against moodle-agent's own, working chat loop, whose
  // `endStreamIfNeeded()` does exactly this): even with `prevRows` reset to 0 above, if the
  // cursor is left *mid-row* when the next prompt redraws, `[kRefreshLine]`'s `cursorTo(0)`
  // moves it to column 0 of that *same* row — the row still holding the tail of what we
  // just wrote — and the following `clearScreenDown` wipes the row from there on, eating
  // whatever was on it (for a short reply, potentially the whole thing, since "that row" is
  // its only row). Ending every turn's output on a fresh blank row (see below, after
  // `drainTurn()`) sidesteps this entirely: `clearScreenDown` then only ever clears blank
  // space, on any row.
  let cursorAtLineStart = true;
  function write(text: string): void {
    stdout.write(text);
    mirror(text);
    if (text.length > 0) cursorAtLineStart = text.endsWith("\n");
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
  }
  function writeLine(text: string): void {
    write(`${text}\n`);
  }

  // Cached lazily (not fetched until the first "/..." line, and only once — the SDK docs
  // don't promise this list changes mid-session, and re-fetching per line would add a
  // round-trip to the CLI subprocess for every turn): every registered command name/alias,
  // built-ins (`/compact`, ...) included, so `/exit`-style local ones never false-flag.
  let knownCommandTokens: Set<string> | null = null;
  async function isKnownSlashCommand(token: string): Promise<boolean> {
    if (!knownCommandTokens) {
      const commands = await run.supportedCommands();
      knownCommandTokens = new Set(commands.flatMap((c) => [c.name, ...(c.aliases ?? [])]));
    }
    return knownCommandTokens.has(token);
  }

  let turnInFlight = false;
  let agentLabelPrinted = false;
  rl.on("SIGINT", () => {
    if (turnInFlight) {
      void run.interrupt();
      writeLine(ui.warn("\n(interrupted)"));
    } else {
      queue.end();
      rl.close();
    }
  });

  if (tuiOptions.welcomeMessage) writeLine(tuiOptions.welcomeMessage);

  try {
    while (true) {
      let line: string;
      try {
        line = (await rl.question(promptLabel)).trim();
      } catch {
        break; // the interface closed underneath us (SIGINT/EOF while idle)
      }

      if (!line) continue;
      mirror(`${promptLabel}${line}\n`);
      if (tuiOptions.historyPath) {
        historyEntries = capHistory([...historyEntries, { text: line, timestamp: new Date().toISOString() }], historyLimit);
        await saveHistory(tuiOptions.historyPath, historyEntries);
      }
      if (exitCommands.has(line.toLowerCase())) break;

      // A line that *looks* like a slash command but matches nothing registered (a typo,
      // an unnamespaced plugin command, ...) would otherwise reach the model as literal
      // text with no special handling — confirmed empirically (captain-whiskers'
      // /chiste before it was renamed /captain-whiskers:chiste) that this can look
      // exactly like nothing happened at all. Caught here, before the turn even starts,
      // so it's an immediate, unambiguous message instead of a guess at what the model's
      // silence on unrecognized input might mean.
      const commandToken = slashCommandToken(line);
      if (commandToken && !(await isKnownSlashCommand(commandToken))) {
        writeLine(ui.warn(`\nUnknown command: /${commandToken}`));
        continue;
      }

      queue.push(line);
      turnInFlight = true;
      agentLabelPrinted = false;
      await drainTurn(events, renderEvent);
      turnInFlight = false;
      if (!cursorAtLineStart) write("\n");
    }
  } finally {
    queue.end();
    run.close();
    setSharedReadline(null);
    rl.close();
    sessionLog?.end();
  }

  function renderEvent(event: AgentEvent): void {
    switch (event.type) {
      case "text":
        if (!tuiOptions.agentLabel) {
          write(event.text);
          return;
        }
        if (!agentLabelPrinted) {
          write(`\n${tuiOptions.agentLabel} `);
          agentLabelPrinted = true;
        }
        write(ui.agent(event.text));
        return;
      case "action":
        writeLine(ui.action(`\n[action] ${formatAction(event.toolName, event.input)}`));
        return;
      case "mcp-error":
        writeLine(ui.warn(`Some MCP servers failed to connect: ${event.failedServers.join(", ")}`));
        return;
      case "info":
        writeLine((event.level === "warning" ? ui.warn : ui.dim)(`\n(${event.text})`));
        return;
      case "turn-end":
        if (event.failed) writeLine(ui.error(`\n${event.errorText}`));
        return;
    }
  }
}
