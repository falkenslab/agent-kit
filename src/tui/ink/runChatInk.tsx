import { createWriteStream, type WriteStream } from "node:fs";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { useSyncExternalStore } from "react";
import { Box, render, Text, useInput } from "ink";
import { Select } from "@inkjs/ui";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type { Mode } from "../../core/agentSpec.js";
import { getInteractionPort, setInteractionPort } from "../../core/interaction.js";
import { createInputQueue, type ModeControl } from "../../core/session.js";
import { runQuery, type AgentRun } from "../../core/runner.js";
import { listRuns, readConversation, type RunFolder } from "../../core/runs.js";
import { capHistory, loadHistory, runChatTui, saveHistory, slashCommandToken, type ChatTuiOptions } from "../chatTui.js";
import * as ui from "../ui.js";
import { t } from "../../core/messages/index.js";
import { applyLanguage } from "../language.js";
import { firstRun, openSession, runDate, runFolderOf, runLabel, type SessionOpener } from "../runs.js";
import { createInkInteraction, type InkInteraction } from "./inkInteraction.js";
import { PromptInput } from "./PromptInput.js";
import { createSessionModel, liveWidth, type SessionModel } from "./sessionModel.js";
import { SessionView, type RenderApproval } from "./SessionView.js";
import { fitWidth, stripAnsi } from "./lineBuffer.js";
import { clipboardSequence, enterFullscreen } from "./fullscreen.js";
import { createCursorController, CursorContext } from "./terminalCursor.js";
import { createTerminalStatus, focusFromReport } from "./terminalStatus.js";
import { listProjectFiles } from "./fileMentions.js";
import type { ToolPhrase } from "./toolGroup.js";
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
   * typing goes back to the bottom), dragging selects text and a right-click copies it,
   * and the terminal is left cleared on exit. Off by default.
   */
  fullscreen?: boolean;
  /**
   * Show the model's predicted next prompt in the empty prompt, accepted with Tab (the SDK's
   * `promptSuggestions`: after every turn but the first, from the parent's prompt cache).
   * On by default; `false` turns it off.
   */
  promptSuggestions?: boolean;
  /**
   * Show the chat's state outside it (on by default): the tab title during a turn, the
   * taskbar button's progress, and a mark on it when a turn ends while the window isn't
   * focused (Windows Terminal). Also enables `/copy`, which copies the last reply.
   */
  terminalIntegration?: boolean;
  /**
   * How one of the agent's own tools counts in a folded group's summary, e.g.
   * `["opened {n} page", "opened {n} pages"]`; built-in tools have their own, and any other
   * counts as "used {n} tools".
   */
  toolPhrase?: (toolName: string) => ToolPhrase | undefined;
  /**
   * The session's mode control (`buildSessionOptions()` returns it): the status bar shows the
   * current mode, and Shift+Tab switches between the modes it allows ("guided" and
   * "interactive"; an autonomous session can't switch). With a session opener, the one it
   * returns is used instead.
   */
  modeControl?: ModeControl;
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

/** A choice asked in place of the prompt (the /resume list). */
export interface ChatPicker {
  title: string;
  options: { label: string; value: string }[];
  /** Settles it with the chosen value, or null if cancelled. */
  resolve(value: string | null): void;
}

export interface ChatInputSnapshot {
  /** The chat loop is waiting for a line (no turn in flight). */
  prompting: boolean;
  history: string[];
  commands: string[];
  /** Lines submitted during a turn, sent in order once the loop asks for the next one. */
  queued: string[];
  /** The model's predicted next prompt, if any (see `InkChatOptions.promptSuggestions`). */
  suggestion: string | null;
  /** Project files for `@` mentions. */
  files: string[];
  /** The current mode, when a mode control is given. */
  mode: Mode | null;
  /** A choice shown in place of the prompt, if any. */
  picker: ChatPicker | null;
  closed: boolean;
}

/**
 * Hands typed lines from the React prompt to the chat loop. The prompt stays on screen
 * during a turn, as in Claude Code: a line submitted then waits in `queued` and is the
 * next one the loop gets.
 */
export function createChatInput() {
  const listeners = new Set<() => void>();
  let snapshot: ChatInputSnapshot = { prompting: false, history: [], commands: [], queued: [], suggestion: null, files: [], mode: null, picker: null, closed: false };
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
    setFiles: (files: string[]) => update({ files }),
    setMode: (mode: Mode | null) => update({ mode }),
    /** Shows a choice in place of the prompt; resolves with the value chosen, or null if cancelled. */
    pick(title: string, options: { label: string; value: string }[]): Promise<string | null> {
      return new Promise((resolve) => {
        update({
          picker: {
            title,
            options,
            resolve(value) {
              update({ picker: null });
              resolve(value);
            },
          },
        });
      });
    },
    /** Takes the last queued line back out of the queue (to edit it in the prompt), or null. */
    unqueueLast(): string | null {
      const last = snapshot.queued.at(-1);
      if (last === undefined) return null;
      update({ queued: snapshot.queued.slice(0, -1) });
      return last;
    },
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
  onFocusChange?: (focused: boolean) => void;
  /** The current session's mode control (a resumed session brings its own). */
  modeControl(): ModeControl | undefined;
  onInterrupt(): void;
}

/** The /resume list, in place of the prompt: ↑/↓ and Enter choose, Esc cancels. */
function PickerPanel({ picker }: { picker: ChatPicker }) {
  const { columns } = stdout;
  useInput((_text, key) => {
    if (key.escape) picker.resolve(null);
  });
  const width = liveWidth(columns) - PROMPT_FRAME_COLUMNS;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold>{picker.title}</Text>
      <Select
        options={picker.options.map((option) => ({ ...option, label: fitWidth(option.label, Math.max(10, width - 2)) }))}
        visibleOptionCount={Math.min(8, picker.options.length)}
        onChange={(value) => picker.resolve(value)}
      />
      <Text dimColor>{t().resumeHint}</Text>
    </Box>
  );
}

function ChatApp({ model, interaction, input, promptLabel, renderApproval, mode, fullscreen, header, onFocusChange, modeControl: currentModeControl, onInterrupt }: ChatAppProps) {
  const chat = useSyncExternalStore(input.subscribe, input.getSnapshot);
  const session = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const checkpoint = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);
  const modeControl = currentModeControl();

  // Ctrl+C stops what is running (a checkpoint, then the turn) and leaves only when idle;
  // Esc interrupts the turn but never answers a checkpoint or leaves.
  useInput((text, key) => {
    const focused = focusFromReport(text);
    if (focused !== null) {
      onFocusChange?.(focused);
      return;
    }
    if (key.ctrl && text === "o") {
      model.toggleExpanded(); // folds or unfolds the tool groups
      return;
    }
    if (key.shift && key.tab) {
      // Shift+Tab: the next mode this session allows.
      if (!modeControl || modeControl.switchable.length < 2) {
        model.note(ui.dim(t().modeLocked(modeControl?.mode ?? mode)), "notice");
        return;
      }
      const next = modeControl.switchable[(modeControl.switchable.indexOf(modeControl.mode) + 1) % modeControl.switchable.length];
      modeControl.set(next);
      input.setMode(next);
      return;
    }
    if (key.ctrl && text === "c" && chat.picker) {
      chat.picker.resolve(null);
      return;
    }
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
      mode={chat.mode ?? mode}
      modeSwitchable={(modeControl?.switchable.length ?? 0) > 1}
      closed={chat.closed}
      fullscreen={fullscreen}
      header={header}
      onCopy={fullscreen ? (text) => void stdout.write(clipboardSequence(text)) : undefined}
    >
      {/* Always there, even during a turn (lines submitted then are queued), as in Claude Code. */}
      <Box flexDirection="column">
        {chat.queued.map((line, index) => (
          <Text key={index} wrap="truncate-end">
            {ui.dim(`  ${t().queued(line)}`)}
          </Text>
        ))}
        {chat.picker ? (
          <PickerPanel picker={chat.picker} />
        ) : (
          <Box borderStyle="round" borderColor="gray" paddingX={1}>
            <PromptInput
              label={promptLabel.replace(/^\n+/, "")}
              history={chat.history}
              commands={chat.commands}
              inset={PROMPT_FRAME_COLUMNS}
              suggestion={chat.suggestion}
              onSubmit={(line) => input.submit(line)}
              onRecallQueued={() => input.unqueueLast()}
              files={chat.files}
              onExit={() => input.submit(null)}
            />
          </Box>
        )}
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
 * Given a session opener instead of options, and `runsDir`, each run keeps its conversation
 * in its own folder and can be resumed: `--continue` on the command line starts with the
 * latest, and `/resume` picks one (see `ChatTuiOptions.runsDir`).
 *
 * Without a TTY (piped, background) or with `plain`, it is `runChatTui()` unchanged.
 */
export async function runChatInk(options: Options | SessionOpener, tuiOptions: InkChatOptions = {}): Promise<void> {
  if (tuiOptions.plain || !stdin.isTTY || !stdout.isTTY) return await runChatTui(options, tuiOptions);
  // Warnings about an unsupported language code go into the chat, not behind the full screen.
  const languageWarnings: string[] = [];
  applyLanguage(tuiOptions.language, (line) => languageWarnings.push(line));

  const opener = typeof options === "function" ? options : null;
  const runsDir = opener ? tuiOptions.runsDir : undefined;
  if (opener && !runsDir) throw new Error("runChatInk(): a session opener needs `runsDir`.");

  const exitCommands = new Set((tuiOptions.exitCommands ?? DEFAULT_EXIT_COMMANDS).map((c) => c.toLowerCase()));
  const promptLabel = tuiOptions.promptLabel ?? DEFAULT_PROMPT_LABEL;
  const userLine = (text: string): string => `${promptLabel.replace(/^\n+/, "")}${text}`;
  const historyLimit = tuiOptions.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  let historyEntries = tuiOptions.historyPath ? capHistory(await loadHistory(tuiOptions.historyPath), historyLimit) : [];

  // The session in use: with runs, the run's folder, rebuilt on /resume.
  let current: { options: Options; modeControl?: ModeControl; run: RunFolder | null } =
    opener && runsDir ? await openSession(opener, await firstRun(runsDir)) : { options: options as Options, run: null };
  const modeControl = (): ModeControl | undefined => current.modeControl ?? tuiOptions.modeControl;

  // With runs, the session log is the run's own; it moves with /resume.
  let sessionLog = null as WriteStream | null;
  function openLog(): void {
    sessionLog?.end();
    const file = current.run ? path.join(current.run.dir, "session.log") : tuiOptions.sessionLogPath;
    sessionLog = file ? createWriteStream(file, { flags: "a" }) : null;
  }
  openLog();
  const mirror = (text: string): void => void sessionLog?.write(stripAnsi(text));

  const model = createSessionModel({
    formatAction: tuiOptions.formatAction,
    toolPhrase: tuiOptions.toolPhrase,
    agentLabel: tuiOptions.agentLabel,
    onWrite: mirror,
    width: () => liveWidth(stdout.columns),
  });
  const interaction = createInkInteraction((text) => model.note(text));
  const input = createChatInput();
  if (tuiOptions.firstPromptSuggestion) input.setSuggestion(tuiOptions.firstPromptSuggestion);
  void listProjectFiles(current.options.cwd ?? process.cwd()).then((files) => input.setFiles(files));

  let turnInterrupted = false;
  function interruptTurn(): void {
    if (turnInterrupted) return;
    turnInterrupted = true;
    void run.interrupt();
    model.writeLine(ui.warn(t().interrupted));
  }

  // One reader per session instead of drainTurn()'s one per turn: the prompt suggestion
  // arrives after its turn's turn-end, while the human is already at the prompt, and MCP
  // errors arrive before the first turn. Still manual .next() calls, never a for-await that
  // could be broken out of (ADR-010). A reader left behind by /resume stops reporting.
  let turnDone: (() => void) | null = null;
  let readError: unknown = null;
  function finishTurn(): void {
    const done = turnDone;
    turnDone = null;
    done?.();
  }

  let queue = createInputQueue();
  let run!: AgentRun;
  let knownCommands!: Promise<Set<string> | null>;
  let generation = 0;
  function connect(): void {
    const own = ++generation;
    queue = createInputQueue();
    run = runQuery(queue.iterable, { ...current.options, promptSuggestions: tuiOptions.promptSuggestions ?? true });
    const events = run.events[Symbol.asyncIterator]();
    input.setMode(modeControl()?.mode ?? null);

    // Every registered command name and alias, built-ins included, for completion and for
    // catching an unknown "/command" before it reaches the model as plain text (see chatTui.ts).
    knownCommands = run.supportedCommands().then(
      (commands) => new Set(commands.flatMap((c) => [c.name, ...(c.aliases ?? [])])),
      () => null,
    );
    void knownCommands.then((names) => {
      const exits = [...exitCommands].filter((c) => c.startsWith("/")).map((c) => c.slice(1));
      const local = [...(tuiOptions.terminalIntegration === false ? [] : ["copy"]), ...(runsDir ? ["resume"] : [])];
      input.setCommands([...new Set([...(names ?? []), ...exits, ...local])].sort());
    });

    void (async () => {
      try {
        while (true) {
          const { value, done } = await events.next();
          if (own !== generation || done) break;
          if (value.type === "prompt-suggestion") {
            input.setSuggestion(value.suggestion);
            continue;
          }
          model.render(value);
          if (value.type === "turn-end") finishTurn();
        }
      } catch (error) {
        if (own === generation) readError = error;
      }
      if (own === generation) finishTurn();
    })();
  }
  connect();

  async function runTurn(line: string): Promise<void> {
    input.setSuggestion(null);
    status?.turnStarted();
    turnInterrupted = false;
    model.separate();
    model.startTurn();
    const finished = new Promise<void>((resolve) => (turnDone = resolve));
    queue.push(line);
    await finished;
    model.endTurn();
    status?.turnEnded();
    void run.contextUsage().then((usage) => usage && model.setContextPercent(usage.percentage));
    if (readError) throw readError;
  }

  /** Draws the run's earlier conversation (when it has one) and says it was resumed. */
  async function showConversation(folder: RunFolder, fromResume: boolean): Promise<void> {
    if (!folder.sessionId) return;
    const messages = await readConversation(folder.dir);
    const [summary] = (await listRuns(path.dirname(folder.dir))).filter((r) => path.resolve(r.dir) === path.resolve(folder.dir));
    // In full screen the history is redrawn from the start; inline, the terminal's
    // scrollback can't be taken back, so the conversation follows what's already there.
    if (fromResume && tuiOptions.fullscreen) model.reset();
    model.replay(messages, userLine);
    model.writeLine(ui.dim(t().resumed(runDate(summary?.updatedAt ?? new Date()))));
  }

  /** /resume: picks one of the runs and switches the session to it. */
  async function resume(): Promise<void> {
    if (!opener || !runsDir) return;
    const runs = await listRuns(runsDir);
    if (runs.length === 0) {
      model.writeLine(ui.dim(t().noEarlierRuns));
      return;
    }
    const chosen = await input.pick(
      t().resumeTitle,
      runs.map((summary, i) => ({ label: `${i + 1}. ${runLabel(summary, current.run ?? undefined)}`, value: summary.dir })),
    );
    const summary = runs.find((r) => r.dir === chosen);
    if (!summary || (current.run && path.resolve(summary.dir) === path.resolve(current.run.dir))) return;
    queue.end();
    run.close();
    current = await openSession(opener, await runFolderOf(summary));
    openLog();
    connect();
    await showConversation(current.run as RunFolder, true);
  }

  const previousPort = getInteractionPort();
  setInteractionPort(interaction.port);
  const restoreTerminal = tuiOptions.fullscreen ? enterFullscreen(stdout) : null;
  const cursor = tuiOptions.fullscreen ? createCursorController(stdout) : null;
  const status =
    tuiOptions.terminalIntegration === false ? null : createTerminalStatus((text) => void stdout.write(text), tuiOptions.header?.title ?? "agent");
  status?.start();
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
      onFocusChange={status ? (focused) => status.setFocused(focused) : undefined}
      modeControl={modeControl}
      onInterrupt={interruptTurn}
    />
    </CursorContext.Provider>,
    // In full screen Ink writes through the cursor controller, which places the terminal's cursor.
    { exitOnCtrlC: false, ...(cursor ? { stdout: cursor.stream } : {}) },
  );

  try {
    // In full screen the header is pinned above the history (see SessionView) instead.
    if (tuiOptions.header && !tuiOptions.fullscreen) model.note(headerLines(tuiOptions.header).join("\n"));
    for (const warning of languageWarnings) model.writeLine(ui.warn(warning));
    if (tuiOptions.welcomeMessage) model.writeLine(tuiOptions.welcomeMessage);
    if (current.run) await showConversation(current.run, false);

    if (tuiOptions.initialPrompt && !current.run?.sessionId) {
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
      model.note(userLine(line), "user");
      if (tuiOptions.historyPath) {
        historyEntries = capHistory([...historyEntries, { text: line, timestamp: new Date().toISOString() }], historyLimit);
        await saveHistory(tuiOptions.historyPath, historyEntries);
      }
      if (exitCommands.has(line.toLowerCase())) break;

      // A local command, never sent to the model: the last reply to the clipboard (OSC 52).
      if (status && line.toLowerCase() === "/copy") {
        const reply = model.lastReply();
        if (reply) stdout.write(clipboardSequence(reply));
        model.writeLine(ui.dim(reply ? t().copiedReply(reply.length) : t().nothingToCopy));
        continue;
      }
      if (runsDir && line.toLowerCase() === "/resume") {
        await resume();
        continue;
      }

      const commandToken = slashCommandToken(line);
      if (commandToken) {
        const names = await knownCommands;
        if (names && !names.has(commandToken)) {
          model.writeLine(ui.warn(t().unknownCommand(commandToken)));
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
    status?.stop();
    restoreTerminal?.();
    sessionLog?.end();
  }
}
