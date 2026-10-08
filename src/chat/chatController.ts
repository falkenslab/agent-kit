import { createWriteStream, type WriteStream } from "node:fs";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Mode } from "../core/agentSpec.js";
import { getInteractionPort, setInteractionPort, type ApprovalPrompt, type ChoiceSettings, type InteractionPort } from "../core/interaction.js";
import { getLanguage, switchLanguage, t } from "../core/messages/index.js";
import { LANGUAGE_NAMES, type Language } from "../core/language.js";
import { runQuery, type AgentEvent, type AgentRun, type SessionUsage } from "../core/runner.js";
import { createRunFolder, listRuns, readConversation, readRunSession, type RunFolder } from "../core/runs.js";
import { createInputQueue, togglePlanMode, type ExtensionsStatus, type ModeControl } from "../core/session.js";
import { hasOpenTodos, parseTodos, TODO_TOOL, type Todo } from "../core/todos.js";
import { withToolLabels, withToolPhrases, type ToolLabels } from "../core/toolLabels.js";
import type { ToolPhrase } from "../core/messages/index.js";
import { createConsoleRenderer } from "../tui/consoleRenderer.js";
import { chatExtensionsCommand } from "./extensions.js";
import type { ExtensionSwitch } from "../core/liveExtensions.js";
import { setExtensionEnabled } from "../core/externalExtensions.js";
import { capHistory, loadHistory, saveHistory, slashCommandToken, type HistoryEntry } from "./history.js";
import { firstRun, openSession, runFolderOf, runLabel, type SessionOpener } from "./runs.js";

/**
 * The chat's logic without an interface (ADR-026, #39): opening, reopening and resuming the
 * session, the input queue and the agent run, the person's lines (commands or turns), the
 * session log and the history. A view (the terminal chats, the web page) draws its `state`, a
 * plain-data snapshot, or follows its `events`, and sends it the person's actions.
 */

/** What the controller needs besides the session: the chats' options it acts on. */
export interface ChatSettings {
  /** Lines (trimmed, case-insensitive) that end the chat. Default `/exit`, `/quit`. */
  exitCommands?: readonly string[];
  /** The first turn, sent before the person types anything, unless the run resumes a conversation. */
  initialPrompt?: string;
  /** The session log without runs (with runs, each run's `session.log`). */
  sessionLogPath?: string;
  /** The label before the person's lines in the session log. */
  promptLabel?: string;
  /** The label before the agent's reply in the session log. */
  agentLabel?: string;
  /** The person's lines, kept across runs (↑/↓). */
  historyPath?: string;
  historyLimit?: number;
  /** With a session opener: where the runs are (required then). */
  runsDir?: string;
  /** Without one, the session's mode control and tool labels. */
  modeControl?: ModeControl;
  toolLabels?: ToolLabels;
  /** Tool call labels and folded-group phrases on top of the kit's and the extensions'. */
  formatAction?: (toolName: string, input: unknown) => string;
  toolPhrase?: (toolName: string) => ToolPhrase | undefined;
  /** Runs the agent: the SDK's (`runQuery()`) by default; another for tests, or a host of its own. */
  runQuery?: (prompt: AsyncIterable<SDKUserMessage>, options: Options) => AgentRun;
  /** The SDK's prompt suggestions (on by default). */
  promptSuggestions?: boolean;
  /**
   * How a choice in place of the prompt is asked (the conversations of `/resume`): a terminal
   * view asks it its way; without it, it's the state's `choice`, answered with `choose()`.
   */
  pick?: (title: string, options: { label: string; value: string }[]) => Promise<string | null>;
  /** The view's own commands, by name without the slash (a terminal's `/copy`): logged and kept in the history like any line, then run by the view. */
  commands?: Record<string, () => void | Promise<void>>;
  /**
   * Who asks the person at a checkpoint: `"view"` (the default) leaves the interaction port to
   * the view (a terminal's panels); `"state"` installs the controller's own, whose panel is the
   * state's `panel`, answered with `answer()`.
   */
  panels?: "view" | "state";
}

/** One tool call in the transcript. */
export interface TranscriptCall {
  id?: string;
  toolName: string;
  label: string;
  result: { isError: boolean; text: string } | null;
  /** What a subagent it started did, by label. */
  children: string[];
}

/** One block of the conversation, as a view shows it. */
export type TranscriptEntry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "agent"; text: string }
  | { id: number; kind: "tools"; calls: TranscriptCall[] }
  | { id: number; kind: "notice"; tone: NoticeTone; text: string }
  | { id: number; kind: "turn-summary"; seconds: number };

/** How a notice reads: plain (the agent's own text), dim (a kit's aside), a warning or an error. */
export type NoticeTone = "plain" | "dim" | "warn" | "error";

/** What a checkpoint asks: an approval, a confirmation after a manual step, free text, or a choice. */
export type ChatQuestion = { kind: "decision" | "manual" | "text"; prompt: ApprovalPrompt } | { kind: "choice"; prompt: ApprovalPrompt; choice: ChoiceSettings };

/** A checkpoint waiting for the person's answer, with `panels: "state"`. */
export type ChatPanel = ChatQuestion & { id: number };

/** The chat's state: plain data, the same for any view. */
export interface ChatState {
  transcript: TranscriptEntry[];
  /** A turn is running. */
  busy: boolean;
  turnStartedAt: number | null;
  /** The label of the agent's latest action in this turn, and of a subagent's. */
  activity: string | null;
  subagentActivity: string | null;
  /** The agent's task list while any task is open. */
  todos: Todo[] | null;
  mode: Mode | null;
  /** The modes the person can switch between (none in autonomous mode). */
  switchableModes: readonly Mode[];
  turns: number;
  usage: SessionUsage | null;
  /** How full the context window is (0-100), after the latest turn. */
  contextPercent: number | null;
  /** The model's predicted next prompt. */
  suggestion: string | null;
  /** The slash commands the person can type: the session's and the chat's own. */
  commands: string[];
  /** The same, with what each does and what it takes after it, for a view that lists them. */
  commandDetails: { name: string; description: string; argumentHint: string }[];
  /** The kit's language now (it can change: `setLanguage()`). */
  language: Language;
  /** The person's earlier lines, oldest first. */
  history: string[];
  /** A checkpoint waiting for an answer (`panels: "state"`). */
  panel: ChatPanel | null;
  /** A choice waiting for an answer (without `pick`). */
  choice: { title: string; options: { label: string; value: string }[] } | null;
  /** The run in use, with runs. */
  run: RunFolder | null;
  extensions: ExtensionsStatus | null;
  closed: boolean;
}

/** What happens in the chat, in order, for a view that draws as it goes (a terminal). */
export type ChatEvent =
  | { type: "agent"; event: AgentEvent }
  | { type: "user"; text: string }
  | { type: "notice"; tone: NoticeTone; text: string }
  | { type: "turn-start" }
  | { type: "turn-end"; seconds: number }
  /** An earlier conversation to draw: the run's, at start or after `/resume`. */
  | { type: "conversation"; messages: { role: "user" | "assistant"; text: string }[]; updatedAt: Date; fromResume: boolean }
  /** The mode changed (the person, or the agent leaving plan mode). */
  | { type: "mode"; mode: Mode }
  /** The session was opened again (resumed, or an extension enabled or disabled). */
  | { type: "session" };

const DEFAULT_EXIT_COMMANDS: readonly string[] = ["/exit", "/quit"];
const DEFAULT_HISTORY_LIMIT = 100;
const DEFAULT_PROMPT_LABEL = "\n> ";

/** A chat controller: its state, events and actions (see `createChatController()`). */
export type ChatController = Awaited<ReturnType<typeof createChatController>>;

/**
 * Opens the chat's session (the first run with a session opener, `--continue` picking the
 * latest) and loads the history; `start()` then draws the run's conversation and sends the
 * initial prompt, `send()` each line the person types.
 */
export async function createChatController(options: Options | SessionOpener, settings: ChatSettings = {}) {
  const opener = typeof options === "function" ? options : null;
  const runsDir = opener ? settings.runsDir : undefined;
  if (opener && !runsDir) throw new Error("A chat with a session opener needs `runsDir`.");
  const exitCommands = new Set((settings.exitCommands ?? DEFAULT_EXIT_COMMANDS).map((command) => command.toLowerCase()));
  const promptLabel = settings.promptLabel ?? DEFAULT_PROMPT_LABEL;
  const historyLimit = settings.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  let historyEntries: HistoryEntry[] = settings.historyPath ? capHistory(await loadHistory(settings.historyPath), historyLimit) : [];

  // The session in use: with runs, the run's folder, opened again on /resume or /extensions.
  let current: { options: Options; modeControl?: ModeControl; toolLabels?: ToolLabels; extensions?: ExtensionsStatus; apis?: Record<string, Record<string, unknown>>; switchExtension?: ExtensionSwitch; run: RunFolder | null } =
    opener && runsDir ? await openSession(opener, await firstRun(runsDir)) : { options: options as Options, run: null };
  const modeControl = (): ModeControl | undefined => current.modeControl ?? settings.modeControl;
  const formatAction = withToolLabels(() => current.toolLabels ?? settings.toolLabels, settings.formatAction);
  const toolPhrase = withToolPhrases(() => current.toolLabels ?? settings.toolLabels, settings.toolPhrase);

  // State and listeners.
  const stateListeners = new Set<(state: ChatState) => void>();
  const eventListeners = new Set<(event: ChatEvent) => void>();
  let nextId = 0;
  let state: ChatState = {
    transcript: [],
    busy: false,
    turnStartedAt: null,
    activity: null,
    subagentActivity: null,
    todos: null,
    mode: null,
    switchableModes: [],
    turns: 0,
    usage: null,
    contextPercent: null,
    suggestion: null,
    commands: [],
    commandDetails: [],
    language: getLanguage(),
    history: historyEntries.map((entry) => entry.text),
    panel: null,
    choice: null,
    run: current.run,
    extensions: current.extensions ?? null,
    closed: false,
  };
  function update(changes: Partial<ChatState>): void {
    state = { ...state, ...changes };
    for (const listener of stateListeners) listener(state);
  }
  function emit(event: ChatEvent): void {
    for (const listener of eventListeners) listener(event);
  }
  function addEntry(entry: TranscriptEntry): void {
    update({ transcript: [...state.transcript, entry] });
  }

  // The session log: the console's text, as the plain chat would print it.
  let sessionLog = null as WriteStream | null;
  function openLog(): void {
    sessionLog?.end();
    const file = current.run ? path.join(current.run.dir, "session.log") : settings.sessionLogPath;
    sessionLog = file ? createWriteStream(file, { flags: "a" }) : null;
  }
  openLog();
  // eslint-disable-next-line no-control-regex -- ESC starts the SGR sequences the renderer writes
  const log = (text: string): void => void sessionLog?.write(text.replace(/\x1b\[[0-9;]*m/g, ""));
  const logRenderer = createConsoleRenderer({ formatAction, agentLabel: settings.agentLabel, output: () => {}, onWrite: log });

  /** A notice: in the transcript, to the views, and in the session log. */
  function notice(text: string, tone: NoticeTone = "dim"): void {
    logRenderer.writeLine(text);
    addEntry({ id: nextId++, kind: "notice", tone, text });
    emit({ type: "notice", tone, text });
  }

  /** What the agent does, into the transcript. */
  function record(event: AgentEvent): void {
    const last = state.transcript.at(-1);
    switch (event.type) {
      case "text":
        if (last?.kind === "agent") update({ transcript: [...state.transcript.slice(0, -1), { ...last, text: last.text + event.text }] });
        else addEntry({ id: nextId++, kind: "agent", text: event.text });
        return;
      case "action": {
        const todos = event.toolName === TODO_TOOL ? parseTodos(event.input) : null;
        if (todos) {
          const doing = todos.find((todo) => todo.status === "in_progress");
          update({ todos: hasOpenTodos(todos) ? todos : null, activity: doing?.activeForm ?? state.activity });
          return;
        }
        const label = formatAction(event.toolName, event.input);
        const call: TranscriptCall = { ...(event.toolUseId ? { id: event.toolUseId } : {}), toolName: event.toolName, label, result: null, children: [] };
        const transcript = last?.kind === "tools" ? [...state.transcript.slice(0, -1), { ...last, calls: [...last.calls, call] }] : [...state.transcript, { id: nextId++, kind: "tools" as const, calls: [call] }];
        update({ transcript, activity: label, subagentActivity: null });
        return;
      }
      case "tool-result":
      case "subagent-action": {
        if (event.type === "tool-result" && event.toolName === TODO_TOOL) return;
        const id = event.type === "tool-result" ? event.toolUseId : event.parentToolUseId;
        const label = event.type === "subagent-action" ? formatAction(event.toolName, event.input) : null;
        const transcript = state.transcript.map((entry) =>
          entry.kind !== "tools" || !entry.calls.some((call) => call.id !== undefined && call.id === id)
            ? entry
            : {
                ...entry,
                calls: entry.calls.map((call) =>
                  call.id !== id ? call : event.type === "tool-result" ? { ...call, result: { isError: event.isError, text: event.text } } : { ...call, children: [...call.children, label!] },
                ),
              },
        );
        update({ transcript, ...(label ? { subagentActivity: label } : {}) });
        return;
      }
      case "mcp-error":
        addEntry({ id: nextId++, kind: "notice", tone: "warn", text: t().mcpFailed(event.failedServers.join(", ")) });
        return;
      case "info":
        addEntry({ id: nextId++, kind: "notice", tone: event.level === "warning" ? "warn" : "dim", text: `(${event.text})` });
        return;
      case "turn-end":
        if (event.failed && event.errorText) addEntry({ id: nextId++, kind: "notice", tone: "error", text: event.errorText });
        update({ turns: state.turns + 1, usage: event.usage ?? state.usage });
        return;
      case "prompt-suggestion":
        update({ suggestion: event.suggestion });
        return;
    }
  }

  // The agent run: one reader per session, never a for-await that could be broken out of
  // (ADR-010); a reader left behind by a reopened session stops reporting.
  let queue = createInputQueue();
  let run!: AgentRun;
  let knownCommands!: Promise<Set<string> | null>;
  let generation = 0;
  let turnDone: (() => void) | null = null;
  let readError: unknown = null;
  let unsubscribeMode: (() => void) | undefined;
  let interrupted = false;
  function finishTurn(): void {
    const done = turnDone;
    turnDone = null;
    done?.();
  }

  /** The commands the session has, and the chat's own, into the state: when it opens, and when an extension is switched in it. */
  function loadCommands(): void {
    const own = generation;
    const control = modeControl();
    const supported = run.supportedCommands().catch(() => null);
    knownCommands = supported.then((commands) => (commands ? new Set(commands.flatMap((command) => [command.name, ...(command.aliases ?? [])])) : null));
    void supported.then((commands) => {
      if (own !== generation) return;
      const exits = [...exitCommands].filter((command) => command.startsWith("/")).map((command) => command.slice(1));
      const viewCommands = Object.keys(settings.commands ?? {}).map((name) => ({ name, description: "", argumentHint: "" }));
      const local = [
        ...viewCommands,
        ...(runsDir ? [{ name: "resume", description: t().commandResume, argumentHint: "" }] : []),
        ...(control?.switchable.includes("plan") ? [{ name: "plan", description: t().commandPlan, argumentHint: "" }] : []),
        { name: "extensions", description: t().commandExtensions, argumentHint: "[enable|disable <name>]" },
      ];
      const details = new Map<string, { name: string; description: string; argumentHint: string }>();
      for (const command of [...(commands ?? []).map(({ name, description, argumentHint }) => ({ name, description: description ?? "", argumentHint: argumentHint ?? "" })), ...local]) details.set(command.name, command);
      for (const name of exits) if (!details.has(name)) details.set(name, { name, description: "", argumentHint: "" });
      const sorted = [...details.values()].sort((a, b) => a.name.localeCompare(b.name));
      update({ commands: sorted.map((command) => command.name), commandDetails: sorted });
    });
  }

  function connect(): void {
    const own = ++generation;
    queue = createInputQueue({ modeControl: modeControl() });
    run = (settings.runQuery ?? runQuery)(queue.iterable, { ...current.options, promptSuggestions: settings.promptSuggestions ?? true });
    const events = run.events[Symbol.asyncIterator]();
    const control = modeControl();
    update({ mode: control?.mode ?? null, switchableModes: control?.switchable ?? [], run: current.run, extensions: current.extensions ?? null });
    unsubscribeMode?.();
    unsubscribeMode = control?.subscribe?.((mode) => {
      update({ mode });
      emit({ type: "mode", mode });
    });
    loadCommands();
    void (async () => {
      try {
        while (true) {
          const { value, done } = await events.next();
          if (own !== generation || done) break;
          if (value.type !== "prompt-suggestion") logRenderer.render(value);
          record(value);
          emit({ type: "agent", event: value });
          if (value.type === "turn-end") finishTurn();
        }
      } catch (error) {
        if (own === generation) readError = error;
      }
      if (own === generation) finishTurn();
    })();
  }

  // The agent's text in the latest turn (for /copy), kept when it ends.
  let latestReply = "";
  // A language switched to, told to the model with the next message (as a mode change is): the
  // session's prompt says it already, but a conversation in another language pulls the replies.
  let languageNotice: string | null = null;
  // Extensions turned off or on in the running session, told to the model with the next message
  // too: the prompt's Extensions section still says what the session opened with.
  const extensionNotices: string[] = [];
  async function runTurn(line: string): Promise<void> {
    interrupted = false;
    const from = state.transcript.length;
    const startedAt = Date.now();
    logRenderer.startTurn();
    update({ busy: true, turnStartedAt: startedAt, activity: null, subagentActivity: null, suggestion: null });
    emit({ type: "turn-start" });
    const finished = new Promise<void>((resolve) => (turnDone = resolve));
    const notices = [languageNotice, ...extensionNotices.splice(0)].filter(Boolean);
    queue.push(notices.length ? `${notices.join("\n")}\n\n${line}` : line);
    languageNotice = null;
    await finished;
    logRenderer.endLine();
    latestReply = state.transcript.slice(from).flatMap((entry) => (entry.kind === "agent" ? [entry.text] : [])).join("").trim();
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    addEntry({ id: nextId++, kind: "turn-summary", seconds });
    update({ busy: false, turnStartedAt: null, activity: null, subagentActivity: null });
    emit({ type: "turn-end", seconds });
    void run.contextUsage().then((usage) => usage && update({ contextPercent: usage.percentage }));
    if (readError) throw readError;
  }

  /** Draws a run's earlier conversation, if it has one. */
  async function showConversation(folder: RunFolder, fromResume: boolean): Promise<void> {
    if (!folder.sessionId) return;
    const messages = await readConversation(folder.dir);
    const [summary] = (await listRuns(path.dirname(folder.dir))).filter((other) => path.resolve(other.dir) === path.resolve(folder.dir));
    const updatedAt = summary?.updatedAt ?? new Date();
    const replayed: TranscriptEntry[] = messages.map((message) => ({ id: nextId++, kind: message.role === "user" ? "user" : "agent", text: message.text }));
    update({ transcript: fromResume ? replayed : [...state.transcript, ...replayed], turns: (fromResume ? 0 : state.turns) + messages.filter((message) => message.role === "user").length });
    emit({ type: "conversation", messages, updatedAt, fromResume });
  }

  /** Switches to another session: a run resumed, or the same one opened again. */
  /** An extension whose lock just changed: switched in the running session if it can be, the session opened again if not. */
  async function applyExtension(name: string, enabled: boolean): Promise<void> {
    if (await current.switchExtension?.(name, enabled).catch(() => false)) {
      notice(t().extensionSwitched(name, enabled));
      extensionNotices.push(
        enabled
          ? `<system-reminder>The user turned the ${name} extension back on: its tools, skills and commands are available again.</system-reminder>`
          : `<system-reminder>The user turned the ${name} extension off: its tools, skills, commands and subagents are gone until it's turned on again, whatever your instructions or earlier messages say.</system-reminder>`,
      );
      update({ extensions: current.extensions ? { ...current.extensions } : null });
      loadCommands();
      return;
    }
    notice(t().extensionToggled(name, enabled));
    await switchTo({ dir: current.run!.dir, sessionId: await readRunSession(current.run!.dir) }, false);
  }

  async function switchTo(folder: RunFolder, fromResume: boolean): Promise<void> {
    queue.end();
    run.close();
    current = await openSession(opener!, folder);
    if (fromResume) openLog();
    connect();
    emit({ type: "session" });
    if (fromResume) await showConversation(current.run as RunFolder, true);
  }

  // A choice in place of the prompt, when the view doesn't ask it itself.
  let choiceResolve: ((value: string | null) => void) | null = null;
  function pick(title: string, options: { label: string; value: string }[]): Promise<string | null> {
    if (settings.pick) return settings.pick(title, options);
    return new Promise((resolve) => {
      choiceResolve = (value) => {
        choiceResolve = null;
        update({ choice: null });
        resolve(value);
      };
      update({ choice: { title, options } });
    });
  }

  // The controller's own interaction port (`panels: "state"`): a checkpoint is the state's panel.
  const answers = new Map<number, (answer: string) => void>();
  function ask(question: ChatQuestion, signal: AbortSignal): Promise<string> {
    const id = nextId++;
    return new Promise((resolve) => {
      const settle = (answer: string): void => {
        answers.delete(id);
        if (state.panel?.id === id) update({ panel: null });
        resolve(answer);
      };
      answers.set(id, settle);
      signal.addEventListener("abort", () => answers.has(id) && settle(""), { once: true });
      update({ panel: { ...question, id } });
    });
  }
  const statePort: InteractionPort = {
    askDecision: (prompt, signal) => ask({ kind: "decision", prompt }, signal),
    askManualIntervention: (prompt, signal) => ask({ kind: "manual", prompt }, signal),
    askText: (prompt, signal) => ask({ kind: "text", prompt }, signal),
    askChoice: (prompt, choice, signal) => ask({ kind: "choice", prompt, choice }, signal),
    notify: (message) => notice(message),
  };
  const previousPort = settings.panels === "state" ? getInteractionPort() : null;
  if (settings.panels === "state") setInteractionPort(statePort);

  connect();

  const controller = {
    /** The state now. */
    getState: (): ChatState => state,
    /** Calls `listener` with every new state; returns how to stop. */
    subscribe(listener: (state: ChatState) => void): () => void {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    /** Calls `listener` with every event, in order; returns how to stop. */
    onEvent(listener: (event: ChatEvent) => void): () => void {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    /** Tool call labels and phrases with the extensions' (for a view that renders events itself). */
    formatAction,
    toolPhrase,
    /** The folder the session works in. */
    cwd: (): string => current.options.cwd ?? process.cwd(),
    /** Draws the run's earlier conversation, then sends the initial prompt (for a new run). */
    async start(): Promise<void> {
      if (current.run) await showConversation(current.run, false);
      if (settings.initialPrompt && !current.run?.sessionId) {
        // Logged but not shown: it's the agent's cue, not something the person typed.
        log(`${promptLabel}${settings.initialPrompt}\n`);
        await runTurn(settings.initialPrompt);
      }
    },
    /**
     * A line the person sent: an exit command ("exit"), one of the chat's commands, or a turn,
     * resolved when it ends. An unknown slash command is caught before it reaches the model.
     */
    async send(raw: string): Promise<"exit" | void> {
      const line = raw.trim();
      if (!line) return;
      log(`${promptLabel}${line}\n`);
      addEntry({ id: nextId++, kind: "user", text: line });
      emit({ type: "user", text: line });
      if (settings.historyPath) {
        historyEntries = capHistory([...historyEntries, { text: line, timestamp: new Date().toISOString() }], historyLimit);
        update({ history: historyEntries.map((entry) => entry.text) });
        await saveHistory(settings.historyPath, historyEntries);
      }
      const lower = line.toLowerCase();
      if (exitCommands.has(lower)) return "exit";
      const own = settings.commands?.[lower.slice(1)];
      if (lower.startsWith("/") && own) return void (await own());
      if (runsDir && lower === "/resume") return void (await controller.resume());
      if (lower === "/plan") return void controller.togglePlan();
      const extensions = await chatExtensionsCommand(line, current.extensions, Boolean(opener && current.run));
      if (extensions) {
        for (const text of extensions.lines) notice(text);
        if (extensions.toggled) await applyExtension(extensions.toggled.name, extensions.toggled.enabled);
        return;
      }
      const token = slashCommandToken(line);
      if (token) {
        const names = await knownCommands;
        if (names && !names.has(token)) return notice(t().unknownCommand(token), "warn");
      }
      await runTurn(line);
    },
    /** Stops the turn running, if any. */
    interrupt(): void {
      if (!state.busy || interrupted) return;
      interrupted = true;
      void run.interrupt();
      notice(t().interrupted, "warn");
    },
    /** Switches to a mode the session allows; says so when it can't. */
    setMode(mode: Mode): void {
      const control = modeControl();
      if (!control || !control.switchable.includes(mode)) return notice(t().modeLocked(control?.mode ?? state.mode ?? undefined));
      control.set(mode);
      if (!control.subscribe) {
        update({ mode });
        emit({ type: "mode", mode });
      }
    },
    /** The next mode the session allows (Shift+Tab). */
    cycleMode(): void {
      const control = modeControl();
      if (!control || control.switchable.length < 2) return notice(t().modeLocked(control?.mode ?? state.mode ?? undefined));
      controller.setMode(control.switchable[(control.switchable.indexOf(control.mode) + 1) % control.switchable.length]!);
    },
    /** Into plan mode, or back to the mode it was entered from (`/plan`). */
    togglePlan(): void {
      const control = modeControl();
      const next = control ? togglePlanMode(control) : null;
      if (!next) return notice(t().modeLocked(control?.mode ?? state.mode ?? undefined));
      if (!control?.subscribe) {
        update({ mode: next });
        emit({ type: "mode", mode: next });
      }
    },
    /** The runs to resume, newest first, labelled for a person. */
    async listRuns(): Promise<{ label: string; dir: string }[]> {
      if (!runsDir) return [];
      return (await listRuns(runsDir)).map((summary, index) => ({ label: `${index + 1}. ${runLabel(summary, current.run ?? undefined)}`, dir: summary.dir }));
    },
    /** `/resume`: with `dir`, switches to that run; without it, asks which. */
    async resume(dir?: string): Promise<void> {
      if (!opener || !runsDir) return;
      const runs = await listRuns(runsDir);
      if (runs.length === 0) return notice(t().noEarlierRuns);
      const chosen = dir ?? (await pick(t().resumeTitle, (await controller.listRuns()).map(({ label, dir: value }) => ({ label, value }))));
      const summary = runs.find((other) => other.dir === chosen);
      if (!summary || (current.run && path.resolve(summary.dir) === path.resolve(current.run.dir))) return;
      await switchTo(await runFolderOf(summary), true);
    },
    /**
     * Starts a new conversation in a new run, leaving the current one to resume later: what a
     * graphical view offers instead of quitting and starting again.
     */
    async newConversation(): Promise<void> {
      if (!opener || !runsDir) return;
      queue.end();
      run.close();
      current = await openSession(opener, await createRunFolder(runsDir));
      openLog();
      update({ transcript: [], turns: 0, usage: null, contextPercent: null, todos: null, suggestion: null });
      connect();
      emit({ type: "session" });
    },
    /**
     * Enables or disables an installed extension: in the running session when it was running when
     * the session opened (#49), by opening the session again with the same conversation otherwise.
     */
    async setExtension(name: string, enabled: boolean): Promise<void> {
      // An action of its own, not a line the person typed: a graphical view's toggle.
      if (!opener || !current.run) return notice(t().extensionsCantReopen);
      const installed = (current.extensions?.installed ?? []).find((extension) => extension.name === name && !extension.shadowed);
      const dir = installed ? current.extensions?.dirs[installed.scope] : undefined;
      if (!installed || !dir) return notice(t().extensionNotInstalled(name));
      await setExtensionEnabled(dir, name, enabled);
      await applyExtension(name, enabled);
    },
    /**
     * Switches the kit's language (`switchLanguage()`) and opens the session again in it, keeping
     * the conversation: the agent's next reply, the labels and the kit's notices come in it.
     * `note` adds the host's own words to what the model is told (the agent's name in that
     * language: the earlier conversation keeps pulling the old one).
     */
    async setLanguage(language: Language, { note }: { note?: string } = {}): Promise<void> {
      switchLanguage(language);
      update({ language });
      const name = LANGUAGE_NAMES[language];
      languageNotice = `<system-reminder>The user switched the chat's language to ${name}. From now on, reply in ${name}, and keep everything you write in ${name}, whatever language earlier messages are in. The names your instructions give now (your own included) are the ones to use.${note ? ` ${note}` : ""}</system-reminder>`;
      if (opener && current.run) await switchTo({ dir: current.run.dir, sessionId: await readRunSession(current.run.dir) }, false);
    },
    /** What an active extension hands the host (its `api`), e.g. the sources' `addSource`; `undefined` when it isn't active. */
    api<T = Record<string, unknown>>(extension: string): T | undefined {
      return current.apis?.[extension] as T | undefined;
    },
    /** Answers the state's panel (`panels: "state"`). */
    answer(panelId: number, answer: string): void {
      answers.get(panelId)?.(answer);
    },
    /** Answers the state's choice (`null`: cancelled). */
    choose(value: string | null): void {
      choiceResolve?.(value);
    },
    /** A notice from the view (a welcome): in the transcript and the session log. */
    notice,
    /** The agent's text in the latest turn that ended, plain (for `/copy`). */
    lastReply: (): string => latestReply,
    /** Ends the chat: the agent run, the session log, the controller's port. */
    close(): void {
      if (state.closed) return;
      queue.end();
      run.close();
      unsubscribeMode?.();
      for (const settle of [...answers.values()]) settle("");
      choiceResolve?.(null);
      if (settings.panels === "state") setInteractionPort(previousPort);
      sessionLog?.end();
      update({ closed: true, busy: false });
    },
  };
  return controller;
}
