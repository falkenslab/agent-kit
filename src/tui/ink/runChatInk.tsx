import { createWriteStream, type WriteStream } from "node:fs";
import { stdin, stdout } from "node:process";
import { useSyncExternalStore } from "react";
import { render, useInput } from "ink";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type { Mode } from "../../core/agentSpec.js";
import { getInteractionPort, setInteractionPort } from "../../core/interaction.js";
import { createInputQueue } from "../../core/session.js";
import { runQuery } from "../../core/runner.js";
import { capHistory, drainTurn, loadHistory, runChatTui, saveHistory, slashCommandToken, type ChatTuiOptions } from "../chatTui.js";
import * as ui from "../ui.js";
import { createInkInteraction, type InkInteraction } from "./inkInteraction.js";
import { PromptInput } from "./PromptInput.js";
import { createSessionModel, liveWidth, type SessionModel } from "./sessionModel.js";
import { SessionView, type RenderApproval } from "./SessionView.js";
import { stripAnsi } from "./lineBuffer.js";

export interface HeaderInfo {
  title: string;
  /** Shown under the title as "name value" pairs, e.g. the workspace or the model. */
  fields?: Record<string, string>;
}

export interface InkChatOptions extends ChatTuiOptions {
  /** Printed once at the top of the chat; not written to the session log. */
  header?: HeaderInfo;
  /** Replaces the default preview in the approval and manual-intervention panels. */
  renderApproval?: RenderApproval;
  /** Shown in the status bar. */
  mode?: Mode;
  /** Use the plain readline chat (`runChatTui()`) even on a TTY. */
  plain?: boolean;
}

const DEFAULT_PROMPT_LABEL = "\n> ";
const DEFAULT_EXIT_COMMANDS: readonly string[] = ["/exit", "/quit"];
const DEFAULT_HISTORY_LIMIT = 100;

interface ChatInputSnapshot {
  prompting: boolean;
  history: string[];
  commands: string[];
  closed: boolean;
}

/** Hands the next typed line from the React prompt to the chat loop. */
function createChatInput() {
  const listeners = new Set<() => void>();
  let snapshot: ChatInputSnapshot = { prompting: false, history: [], commands: [], closed: false };
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
    /** Resolves with the submitted line, or null once the human asked to leave. */
    next(history: string[]): Promise<string | null> {
      if (exited) return Promise.resolve(null);
      update({ prompting: true, history });
      return new Promise((resolve) => (pending = resolve));
    },
    submit(line: string | null): void {
      if (line === null) exited = true;
      const resolve = pending;
      pending = null;
      update({ prompting: false });
      resolve?.(line);
    },
    setCommands: (commands: string[]) => update({ commands }),
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
  onInterrupt(): void;
}

function ChatApp({ model, interaction, input, promptLabel, renderApproval, mode, onInterrupt }: ChatAppProps) {
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
    <SessionView model={model} interaction={interaction} renderApproval={renderApproval} mode={mode} closed={chat.closed}>
      {chat.prompting ? (
        <PromptInput
          label={promptLabel.replace(/^\n+/, "")}
          history={chat.history}
          commands={chat.commands}
          onSubmit={(line) => input.submit(line)}
          onExit={() => input.submit(null)}
        />
      ) : null}
    </SessionView>
  );
}

function headerText(header: HeaderInfo): string {
  const fields = Object.entries(header.fields ?? {}).map(([name, value]) => `${ui.dim(name)} ${value}`);
  return [ui.heading(header.title), ...(fields.length > 0 ? [fields.join("   ")] : [])].join("\n");
}

/**
 * The Ink counterpart of `runChatTui()`, with the same options, session log and history
 * file: history in the scrollback, the reply streaming in place, a spinner with the
 * current action (and a subagent's), approval panels, "/command" completion and a status
 * bar. Checkpoints go through an Ink `InteractionPort` while the chat runs, so no second
 * stdin reader ever competes with Ink's; the response file keeps working as always.
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
  const run = runQuery(queue.iterable, options);
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

  async function runTurn(line: string): Promise<void> {
    queue.push(line);
    turnInterrupted = false;
    model.separate();
    model.startTurn();
    await drainTurn(events, model.render);
    model.endTurn();
  }

  const previousPort = getInteractionPort();
  setInteractionPort(interaction.port);
  const app = render(
    <ChatApp
      model={model}
      interaction={interaction}
      input={input}
      promptLabel={promptLabel}
      renderApproval={tuiOptions.renderApproval}
      mode={tuiOptions.mode}
      onInterrupt={interruptTurn}
    />,
    { exitOnCtrlC: false },
  );

  try {
    if (tuiOptions.header) model.note(headerText(tuiOptions.header));
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
    sessionLog?.end();
  }
}
