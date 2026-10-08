import { stdin, stdout } from "node:process";
import { useSyncExternalStore } from "react";
import { Box, render, Text, useInput } from "ink";
import { Select } from "@inkjs/ui";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type { Mode } from "../../core/agentSpec.js";
import { getInteractionPort, setInteractionPort } from "../../core/interaction.js";
import type { ModeControl } from "../../core/session.js";
import { runChatTui, type ChatTuiOptions } from "../chatTui.js";
import { createChatController, type ChatController, type NoticeTone } from "../../chat/chatController.js";
import * as ui from "../ui.js";
import { t } from "../../core/messages/index.js";
import { applyLanguage } from "../language.js";
import { applyTheme, inkColor } from "../theme.js";
import { KitTheme } from "./inkTheme.js";
import { runDate, type SessionOpener } from "../../chat/runs.js";
import { createInkInteraction, type InkInteraction } from "./inkInteraction.js";
import { PromptInput } from "./PromptInput.js";
import { createSessionModel, liveWidth, type SessionModel } from "./sessionModel.js";
import { SessionView, type RenderApproval } from "./SessionView.js";
import { fitWidth } from "./lineBuffer.js";
import { clipboardSequence, enterFullscreen } from "./fullscreen.js";
import { createCursorController, CursorContext } from "./terminalCursor.js";
import { createTerminalStatus, focusFromReport } from "./terminalStatus.js";
import { listProjectFiles } from "./fileMentions.js";
import type { ResultFormatter, ToolDetail, ToolPhrase } from "./toolGroup.js";
import { headerLines, type HeaderInfo } from "./header.js";

export type { HeaderInfo } from "./header.js";

/** Options of `runChatInk()`: the chat's options plus the Ink-only ones. */
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
   * How much of the tool calls shows: `"full"` (the default), every call with its result
   * line; `"calls"`, the calls without their results, a failed one with a short line in the
   * kit's language instead of the tool's error; `"summary"`, one line per group ("Read 2
   * files, ran 1 shell command"). Ctrl+O unfolds any of them into the full view. For an
   * audience that doesn't need the tools' raw output. The session log is the same whatever
   * the level.
   */
  toolDetail?: ToolDetail;
  /**
   * The line under a tool call for its result, e.g. a friendly one for an MCP tool whose
   * output is written for the model: a string replaces the kit's (the result's first line),
   * `null` hides it, `undefined` keeps it. Shown wherever results are (`"full"`, or unfolded).
   */
  formatResult?: ResultFormatter;
  /**
   * The session's mode control (`buildSessionOptions()` returns it): the status bar shows the
   * current mode, Shift+Tab switches between the modes it allows ("guided", "interactive"
   * and "plan"; an autonomous session can't switch), and entering or leaving plan mode is
   * told to the model with the next message. With a session opener, the one it returns is
   * used instead.
   */
  modeControl?: ModeControl;
  /**
   * The suggestion shown (and taken with Tab) until the first turn starts: the SDK never
   * suggests after the first turn, so without it the prompt is empty until the second reply.
   */
  firstPromptSuggestion?: string;
}

const DEFAULT_PROMPT_LABEL = "\n> ";
/** The chat's own commands, never sent to the model (the awareness extension's help skill lists them; a test keeps both in step). */
export const DEFAULT_EXIT_COMMANDS: readonly string[] = ["/exit", "/quit"];
export const LOCAL_COMMANDS = { copy: "/copy", resume: "/resume", plan: "/plan", extensions: "/extensions" } as const;
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
  /** The chat's logic: the mode, the interrupt. */
  controller: ChatController;
}

/** The /resume list, in place of the prompt: ↑/↓ and Enter choose, Esc cancels. */
function PickerPanel({ picker }: { picker: ChatPicker }) {
  const { columns } = stdout;
  useInput((_text, key) => {
    if (key.escape) picker.resolve(null);
  });
  const width = liveWidth(columns) - PROMPT_FRAME_COLUMNS;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={inkColor("border")} paddingX={1}>
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

function ChatApp({ model, interaction, input, promptLabel, renderApproval, mode, fullscreen, header, onFocusChange, controller }: ChatAppProps) {
  const chat = useSyncExternalStore(input.subscribe, input.getSnapshot);
  const session = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const checkpoint = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);
  const control = useSyncExternalStore(controller.subscribe, controller.getState);
  const onInterrupt = (): void => controller.interrupt();

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
      controller.cycleMode();
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
      mode={control.mode ?? mode}
      modeSwitchable={control.switchableModes.length > 1}
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
          <Box borderStyle="round" borderColor={inkColor("border")} paddingX={1}>
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
  applyTheme(tuiOptions.theme);

  const promptLabel = tuiOptions.promptLabel ?? DEFAULT_PROMPT_LABEL;
  const userLine = (text: string): string => `${promptLabel.replace(/^\n+/, "")}${text}`;
  const input = createChatInput();
  // Set once the terminal integration is up: /copy needs it.
  let status: ReturnType<typeof createTerminalStatus> | null = null;
  const controller = await createChatController(options, {
    exitCommands: tuiOptions.exitCommands ?? DEFAULT_EXIT_COMMANDS,
    initialPrompt: tuiOptions.initialPrompt,
    sessionLogPath: tuiOptions.sessionLogPath,
    promptLabel,
    agentLabel: tuiOptions.agentLabel,
    historyPath: tuiOptions.historyPath,
    historyLimit: tuiOptions.historyLimit ?? DEFAULT_HISTORY_LIMIT,
    runsDir: tuiOptions.runsDir,
    modeControl: tuiOptions.modeControl,
    toolLabels: tuiOptions.toolLabels,
    formatAction: tuiOptions.formatAction,
    toolPhrase: tuiOptions.toolPhrase,
    promptSuggestions: tuiOptions.promptSuggestions ?? true,
    // The /resume list in place of the prompt.
    pick: (title, choices) => input.pick(title, choices),
    // A local command, never sent to the model: the last reply to the clipboard (OSC 52).
    ...(tuiOptions.terminalIntegration === false
      ? {}
      : {
          commands: {
            copy: () => {
              const reply = controller.lastReply();
              if (reply) stdout.write(clipboardSequence(reply));
              model.writeLine(ui.dim(reply ? t().copiedReply(reply.length) : t().nothingToCopy));
            },
          },
        }),
  });

  // The screen, drawn from the controller's events; the session log is the controller's.
  const model = createSessionModel({
    formatAction: controller.formatAction,
    toolPhrase: controller.toolPhrase,
    toolDetail: tuiOptions.toolDetail,
    formatResult: tuiOptions.formatResult,
    agentLabel: tuiOptions.agentLabel,
    width: () => liveWidth(stdout.columns),
  });
  const interaction = createInkInteraction((text) => model.note(text));
  if (tuiOptions.firstPromptSuggestion) input.setSuggestion(tuiOptions.firstPromptSuggestion);
  const refreshFiles = (): void => void listProjectFiles(controller.cwd()).then((files) => input.setFiles(files));
  refreshFiles();

  const toned = (text: string, tone: NoticeTone): string => (tone === "plain" ? text : tone === "dim" ? ui.dim(text) : tone === "warn" ? ui.warn(text) : ui.error(text));
  controller.onEvent((event) => {
    switch (event.type) {
      case "agent":
        if (event.event.type === "prompt-suggestion") input.setSuggestion(event.event.suggestion);
        else model.render(event.event);
        return;
      case "user":
        model.note(userLine(event.text), "user");
        return;
      case "notice":
        model.writeLine(toned(event.text, event.tone));
        return;
      case "turn-start":
        input.setSuggestion(null);
        status?.turnStarted();
        model.separate();
        model.startTurn();
        return;
      case "turn-end":
        model.endTurn();
        status?.turnEnded();
        return;
      case "conversation":
        // In full screen the history is redrawn from the start; inline, the terminal's
        // scrollback can't be taken back, so the conversation follows what's already there.
        if (event.fromResume && tuiOptions.fullscreen) model.reset();
        model.replay(event.messages, userLine);
        model.writeLine(ui.dim(t().resumed(runDate(event.updatedAt))));
        return;
      case "session":
        refreshFiles();
        return;
      case "mode":
        return; // the status bar follows the state
    }
  });
  controller.subscribe((state) => {
    input.setCommands(state.commands);
    if (state.contextPercent !== model.getSnapshot().contextPercent) model.setContextPercent(state.contextPercent);
  });

  const previousPort = getInteractionPort();
  setInteractionPort(interaction.port);
  const restoreTerminal = tuiOptions.fullscreen ? enterFullscreen(stdout) : null;
  const cursor = tuiOptions.fullscreen ? createCursorController(stdout) : null;
  status = tuiOptions.terminalIntegration === false ? null : createTerminalStatus((text) => void stdout.write(text), tuiOptions.header?.title ?? "agent");
  status?.start();
  const app = render(
    <CursorContext.Provider value={cursor}>
    <KitTheme>
    <ChatApp
      model={model}
      interaction={interaction}
      input={input}
      promptLabel={promptLabel}
      renderApproval={tuiOptions.renderApproval}
      mode={tuiOptions.mode}
      fullscreen={tuiOptions.fullscreen}
      header={tuiOptions.header && tuiOptions.fullscreen ? headerLines(tuiOptions.header) : undefined}
      onFocusChange={status ? (focused) => status?.setFocused(focused) : undefined}
      controller={controller}
    />
    </KitTheme>
    </CursorContext.Provider>,
    // In full screen Ink writes through the cursor controller, which places the terminal's cursor.
    { exitOnCtrlC: false, ...(cursor ? { stdout: cursor.stream } : {}) },
  );

  try {
    // In full screen the header is pinned above the history (see SessionView) instead.
    if (tuiOptions.header && !tuiOptions.fullscreen) model.note(headerLines(tuiOptions.header).join("\n"));
    for (const warning of languageWarnings) controller.notice(warning, "warn");
    if (tuiOptions.welcomeMessage) controller.notice(tuiOptions.welcomeMessage, "plain");
    await controller.start();

    while (true) {
      // The blank line before the prompt is in place while typing, so Enter doesn't push
      // everything down a line: promptLabel's own leading newlines only reach the log.
      model.separate();
      const line = await input.next(controller.getState().history);
      if (line === null) break;
      if ((await controller.send(line)) === "exit") break;
    }
  } finally {
    setInteractionPort(previousPort);
    controller.close();
    input.close();
    // One more frame with only the history, so the prompt and status bar don't stay behind.
    await new Promise((resolve) => setTimeout(resolve, 0));
    app.unmount();
    await app.waitUntilExit();
    status?.stop();
    restoreTerminal?.();
  }
}
