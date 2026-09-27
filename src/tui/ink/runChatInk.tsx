import { createWriteStream, type WriteStream } from "node:fs";
import { stdin, stdout } from "node:process";
import { useSyncExternalStore } from "react";
import { Box, render, Text, useInput } from "ink";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type { Mode } from "../../core/agentSpec.js";
import { getInteractionPort, setInteractionPort } from "../../core/interaction.js";
import { createInputQueue } from "../../core/session.js";
import { runQuery } from "../../core/runner.js";
import { capHistory, loadHistory, runChatTui, saveHistory, slashCommandToken, type ChatTuiOptions } from "../chatTui.js";
import * as ui from "../ui.js";
import { createInkInteraction, type InkInteraction } from "./inkInteraction.js";
import { PromptInput } from "./PromptInput.js";
import { createSessionModel, liveWidth, type SessionModel } from "./sessionModel.js";
import { SessionView, type RenderApproval } from "./SessionView.js";
import { stripAnsi } from "./lineBuffer.js";
import { enterFullscreen } from "./fullscreen.js";
import { createCursorController, CursorContext } from "./terminalCursor.js";
import { headerLines, type HeaderInfo } from "./header.js";

export type { HeaderInfo } from "./header.js";

export interface InkChatOptions extends ChatTuiOptions {
  /**
   * Title, fields and an optional logo for the top of the chat: fixed at the top in full
   * screen, printed once at the start otherwise. Not written to the session log.
   */
  header?: HeaderInfo;
  /** Replaces the default preview in the approval and manual-intervention panels. */
  renderApproval?: RenderApproval;
  /** Shown in the status bar. */
  mode?: Mode;
  /** Use the plain readline chat (`runChatTui()`) even on a TTY. */
  plain?: boolean;
  /**
   * Take the whole terminal (its alternate screen): the history scrolls in its own view
   * above a prompt pinned at the bottom (PageUp/PageDown and the wheel scroll, Ctrl+End or
   * typing goes back to the bottom), and the terminal is left cleared on exit. Selecting
   * text with the mouse needs Shift, since the wheel is captured. Off by default.
   */
  fullscreen?: boolean;
  /**
   * Show the model's predicted next prompt in the empty prompt, accepted with Tab (the SDK's
   * `promptSuggestions`: after every turn but the first, from the parent's prompt cache).
   * On by default; `false` turns it off.
   */
  promptSuggestions?: boolean;
  /**
   * The suggestion shown (and taken with Tab) until the first turn starts: the SDK never
   * suggests after the first turn, so without it the prompt is empty until the second reply.
   */
  firstPromptSuggestion?: string;
}

const DEFAULT_PROMPT_LABEL = "\n> ";
const DEFAULT_EXIT_COMMANDS: readonly string[] = ["/exit", "/quit"];
const DEFAULT_HISTORY_LIMIT = 100;
// The prompt's frame: a border and one column of padding on each side.
const PROMPT_FRAME_COLUMNS = 4;

export interface ChatInputSnapshot {
  /** The chat loop is waiting for a line (no turn in flight). */
  prompting: boolean;
  history: string[];
  commands: string[];
  /** Lines submitted during a turn, sent in order once the loop asks for the next one. */
  queued: string[];
  /** The model's predicted next prompt, if any (see `InkChatOptions.promptSuggestions`). */
  suggestion: string | null;
  closed: boolean;
}

/**
 * Hands typed lines from the React prompt to the chat loop. The prompt stays on screen
 * during a turn, as in Claude Code: a line submitted then waits in `queued` and is the
 * next one the loop gets.
 */
export function createChatInput() {
  const listeners = new Set<() => void>();
  let snapshot: ChatInputSnapshot = { prompting: false, history: [], commands: [], queued: [], suggestion: null, closed: false };
  let pending: ((line: string | null) => void) | null = null;
  let exited = false;

  function update(changes: Partial<ChatInputSnapshot>): void {
    snapshot = { ...snapshot, ...changes };
    for (const listener of listeners) listener();
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    /** Resolves with the next line (a queued one first), or null once the human asked to leave. */
    next(history: string[]): Promise<string | null> {
      if (exited) return Promise.resolve(null);
      const [first, ...rest] = snapshot.queued;
      if (first !== undefined) {
        update({ queued: rest, history });
        return Promise.resolve(first);
      }
      update({ prompting: true, history });
      return new Promise((resolve) => (pending = resolve));
    },
    submit(line: string | null): void {
      if (line === null) exited = true;
      const resolve = pending;
      if (!resolve) {
        // A turn is in flight: keep the line for later (an empty one means nothing).
        if (line !== null && line.trim()) update({ queued: [...snapshot.queued, line] });
        return;
      }
      pending = null;
      update({ prompting: false });
      resolve(line);
    },
    setCommands: (commands: string[]) => update({ commands }),
    setSuggestion: (suggestion: string | null) => update({ suggestion }),
    close: () => update({ prompting: false, closed: true }),
  };
}

type ChatInput = ReturnType<typeof createChatInput>;

interface ChatAppProps {
  model: SessionModel;
  interaction: InkInteraction;
  input: ChatInput;
  promptLabel: string;
  renderApproval?: RenderApproval;
  mode?: Mode;
  fullscreen?: boolean;
  header?: string[];
  onInterrupt(): void;
}

function ChatApp({ model, interaction, input, promptLabel, renderApproval, mode, fullscreen, header, onInterrupt }: ChatAppProps) {
  const chat = useSyncExternalStore(input.subscribe, input.getSnapshot);
  const session = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const checkpoint = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);

  // Ctrl+C stops what is running (a checkpoint, then the turn) and leaves only when idle;
  // Esc interrupts the turn but never answers a checkpoint or leaves.
  useInput((text, key) => {
    if (key.ctrl && text === "c") {
      if (checkpoint) checkpoint.answer(checkpoint.kind === "decision" ? "q" : "");
      if (checkpoint || session.busy) onInterrupt();
      else input.submit(null);
    } else if (key.escape && session.busy && !checkpoint) {
      onInterrupt();
    }
  });

  return (
    <SessionView
      model={model}
      interaction={interaction}
      renderApproval={renderApproval}
      mode={mode}
      closed={chat.closed}
      fullscreen={fullscreen}
      header={header}
    >
      {/* Always there, even during a turn (lines submitted then are queued), as in Claude Code. */}
      <Box flexDirection="column">
        {chat.queued.map((line, index) => (
          <Text key={index} wrap="truncate-end">
            {ui.dim(`  queued: ${line}`)}
          </Text>
        ))}
        <Box borderStyle="round" borderColor="gray" paddingX={1}>
          <PromptInput
            label={promptLabel.replace(/^\n+/, "")}
            history={chat.history}
            commands={chat.commands}
            inset={PROMPT_FRAME_COLUMNS}
            suggestion={chat.suggestion}
            onSubmit={(line) => input.submit(line)}
            onExit={() => input.submit(null)}
          />
        </Box>
      </Box>
    </SessionView>
  );
}

/**
 * The Ink counterpart of `runChatTui()`, with the same options, session log and history
 * file: history in the scrollback, the reply streaming in place, a spinner with the
 * current action (and a subagent's), approval panels, "/command" completion and a status
 * bar. Checkpoints go through an Ink `InteractionPort` while the chat runs, so no second
 * stdin reader ever competes with Ink's; the response file keeps working as always.
 *
 * With `fullscreen` it takes the whole terminal instead (see `InkChatOptions.fullscreen`).
 *
 * Without a TTY (piped, background) or with `plain`, it is `runChatTui()` unchanged.
 */
export async function runChatInk(options: Options, tuiOptions: InkChatOptions = {}): Promise<void> {
  if (tuiOptions.plain || !stdin.isTTY || !stdout.isTTY) return await runChatTui(options, tuiOptions);

  const exitCommands = new Set((tuiOptions.exitCommands ?? DEFAULT_EXIT_COMMANDS).map((c) => c.toLowerCase()));
  const promptLabel = tuiOptions.promptLabel ?? DEFAULT_PROMPT_LABEL;
  const historyLimit = tuiOptions.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  let historyEntries = tuiOptions.historyPath ? capHistory(await loadHistory(tuiOptions.historyPath), historyLimit) : [];

  const queue = createInputQueue();
  const run = runQuery(queue.iterable, { ...options, promptSuggestions: tuiOptions.promptSuggestions ?? true });
  const events = run.events[Symbol.asyncIterator]();

  const sessionLog: WriteStream | null = tuiOptions.sessionLogPath ? createWriteStream(tuiOptions.sessionLogPath, { flags: "a" }) : null;
  const mirror = (text: string): void => void sessionLog?.write(stripAnsi(text));

  const model = createSessionModel({
    formatAction: tuiOptions.formatAction,
    agentLabel: tuiOptions.agentLabel,
    onWrite: mirror,
    width: () => liveWidth(stdout.columns),
  });
  const interaction = createInkInteraction((text) => model.note(text));
  const input = createChatInput();
  if (tuiOptions.firstPromptSuggestion) input.setSuggestion(tuiOptions.firstPromptSuggestion);

  // Every registered command name and alias, built-ins included, for completion and for
  // catching an unknown "/command" before it reaches the model as plain text (see chatTui.ts).
  const knownCommands = run.supportedCommands().then(
    (commands) => new Set(commands.flatMap((c) => [c.name, ...(c.aliases ?? [])])),
    () => null,
  );
  void knownCommands.then((names) => {
    const exits = [...exitCommands].filter((c) => c.startsWith("/")).map((c) => c.slice(1));
    input.setCommands([...new Set([...(names ?? []), ...exits])].sort());
  });

  let turnInterrupted = false;
  function interruptTurn(): void {
    if (turnInterrupted) return;
    turnInterrupted = true;
    void run.interrupt();
    model.writeLine(ui.warn("(interrupted)"));
  }

  // One reader for the whole session instead of drainTurn()'s one per turn: the prompt
  // suggestion arrives after its turn's turn-end, while the human is already at the prompt,
  // and MCP errors arrive before the first turn. Still manual .next() calls, never a
  // for-await that could be broken out of (ADR-010).
  let turnDone: (() => void) | null = null;
  let readError: unknown = null;
  function finishTurn(): void {
    const done = turnDone;
    turnDone = null;
    done?.();
  }
  void (async () => {
    try {
      while (true) {
        const { value, done } = await events.next();
        if (done) break;
        if (value.type === "prompt-suggestion") {
          input.setSuggestion(value.suggestion);
          continue;
        }
        model.render(value);
        if (value.type === "turn-end") finishTurn();
      }
    } catch (error) {
      readError = error;
    }
    finishTurn();
  })();

  async function runTurn(line: string): Promise<void> {
    input.setSuggestion(null);
    turnInterrupted = false;
    model.separate();
    model.startTurn();
    const finished = new Promise<void>((resolve) => (turnDone = resolve));
    queue.push(line);
    await finished;
    model.endTurn();
    if (readError) throw readError;
  }

  const previousPort = getInteractionPort();
  setInteractionPort(interaction.port);
  const restoreTerminal = tuiOptions.fullscreen ? enterFullscreen(stdout) : null;
  const cursor = tuiOptions.fullscreen ? createCursorController(stdout) : null;
  const app = render(
    <CursorContext.Provider value={cursor}>
    <ChatApp
      model={model}
      interaction={interaction}
      input={input}
      promptLabel={promptLabel}
      renderApproval={tuiOptions.renderApproval}
      mode={tuiOptions.mode}
      fullscreen={tuiOptions.fullscreen}
      header={tuiOptions.header && tuiOptions.fullscreen ? headerLines(tuiOptions.header) : undefined}
      onInterrupt={interruptTurn}
    />
    </CursorContext.Provider>,
    // In full screen Ink writes through the cursor controller, which places the terminal's cursor.
    { exitOnCtrlC: false, ...(cursor ? { stdout: cursor.stream } : {}) },
  );

  try {
    // In full screen the header is pinned above the history (see SessionView) instead.
    if (tuiOptions.header && !tuiOptions.fullscreen) model.note(headerLines(tuiOptions.header).join("\n"));
    if (tuiOptions.welcomeMessage) model.writeLine(tuiOptions.welcomeMessage);

    if (tuiOptions.initialPrompt) {
      // Logged but not shown, like runChatTui(): it is the agent's cue, not something typed.
      mirror(`${promptLabel}${tuiOptions.initialPrompt}\n`);
      await runTurn(tuiOptions.initialPrompt);
    }

    while (true) {
      // The blank line before the prompt is in place while typing, so Enter doesn't push
      // everything down a line: promptLabel's own leading newlines only reach the log.
      model.separate();
      const raw = await input.next(historyEntries.map((entry) => entry.text));
      if (raw === null) break;
      const line = raw.trim();
      if (!line) continue;

      mirror(`${promptLabel}${line}\n`);
      model.note(`${promptLabel.replace(/^\n+/, "")}${line}`, "user");
      if (tuiOptions.historyPath) {
        historyEntries = capHistory([...historyEntries, { text: line, timestamp: new Date().toISOString() }], historyLimit);
        await saveHistory(tuiOptions.historyPath, historyEntries);
      }
      if (exitCommands.has(line.toLowerCase())) break;

      const commandToken = slashCommandToken(line);
      if (commandToken) {
        const names = await knownCommands;
        if (names && !names.has(commandToken)) {
          model.writeLine(ui.warn(`Unknown command: /${commandToken}`));
          continue;
        }
      }

      await runTurn(line);
    }
  } finally {
    setInteractionPort(previousPort);
    queue.end();
    run.close();
    input.close();
    // One more frame with only the history, so the prompt and status bar don't stay behind.
    await new Promise((resolve) => setTimeout(resolve, 0));
    app.unmount();
    await app.waitUntilExit();
    restoreTerminal?.();
    sessionLog?.end();
  }
}
