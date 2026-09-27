import type { AgentEvent, SessionUsage } from "../../core/runner.js";
import { createFriendlyToolLabel } from "../../core/toolLabels.js";
import { createConsoleRenderer, type ConsoleRenderer } from "../consoleRenderer.js";
import { createLineBuffer, stripAnsi } from "./lineBuffer.js";

export interface HistoryItem {
  id: number;
  text: string;
}

/**
 * What a line of output is, which is also its color: the human's line, the agent's words,
 * its actions, a notice (welcome, info, warnings), an error, or a checkpoint/header note.
 */
export type OutputKind = "user" | "agent" | "action" | "notice" | "error" | "note";

export interface SessionSnapshot {
  /** Finished lines, rendered once in Ink's `<Static>` and left in the scrollback. */
  items: HistoryItem[];
  /** The line still being written, e.g. the agent's reply mid-stream. */
  live: string;
  /** The line in progress starts a new kind of output: shown with a blank line above it. */
  liveGap: boolean;
  /** A turn is in flight. */
  busy: boolean;
  /** Label of the main agent's latest action in this turn. */
  activity: string | null;
  /** Label of the latest action taken inside a subagent in this turn. */
  subagentActivity: string | null;
  turns: number;
  usage: SessionUsage | null;
}

export interface SessionModelOptions {
  formatAction?: (toolName: string, toolInput: unknown) => string;
  agentLabel?: string;
  /** Called with everything the console renderer writes, e.g. to mirror a session log. */
  onWrite?: (text: string) => void;
  /** Columns the line in progress may take before its full rows move to the history (see lineBuffer.ts). */
  width?: () => number;
}

/**
 * Columns the live area may use: short of the edge, where the Windows console wraps early
 * (see lineBuffer.ts). Read on every use, so a resized terminal is picked up.
 */
export function liveWidth(columns: number | undefined): number {
  return Math.max(1, (columns || 80) - 4);
}

export interface SessionModel {
  /** The console renderer behind the history, for writes that aren't events. */
  renderer: ConsoleRenderer;
  render(event: AgentEvent): void;
  /** A line through the console renderer: shown and passed to `onWrite`. */
  writeLine(text: string, kind?: OutputKind): void;
  /** Lines shown in the history but not passed to `onWrite` (the human's line, checkpoints, the header). */
  note(text: string, kind?: OutputKind): void;
  /** One blank line in the history (not logged), unless the history is empty or already ends on one. */
  separate(): void;
  startTurn(): void;
  endTurn(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): SessionSnapshot;
  /** The agent's text in the latest turn, plain (for /copy). */
  lastReply(): string;
}

const EVENT_KINDS: Record<AgentEvent["type"], OutputKind> = {
  text: "agent",
  action: "action",
  "subagent-action": "action",
  "mcp-error": "notice",
  info: "notice",
  "turn-end": "error",
  "prompt-suggestion": "notice", // never printed
};

const isBlank = (line: string): boolean => stripAnsi(line).trim() === "";

/**
 * The state behind the Ink views. Every event goes through `createConsoleRenderer()`, so
 * `onWrite` logs exactly what the plain console shows, and the history reads the same
 * text, spaced for reading: one blank line wherever the kind of output (its color)
 * changes, none inside a run of the same kind (consecutive actions stay together). Ink only
 * adds what a console can't redraw (the line in progress, a spinner, the status bar).
 */
export function createSessionModel(options: SessionModelOptions = {}): SessionModel {
  const formatAction = options.formatAction ?? createFriendlyToolLabel();
  const buffer = createLineBuffer();
  const listeners = new Set<() => void>();
  let nextId = 0;
  let snapshot: SessionSnapshot = {
    items: [],
    live: "",
    liveGap: false,
    busy: false,
    activity: null,
    subagentActivity: null,
    turns: 0,
    usage: null,
  };

  function update(changes: Partial<SessionSnapshot>): void {
    snapshot = { ...snapshot, ...changes };
    for (const listener of listeners) listener();
  }

  // The kind being written now, the kind of the line in progress (the kind it started
  // with) and the kind of the last line shown.
  let currentKind: OutputKind = "notice";
  let partialKind: OutputKind = "notice";
  let lastKind: OutputKind | null = null;
  // Blank lines inside a run (paragraphs in a reply), held until the next line shows
  // whether the run goes on (kept) or another kind follows (replaced by one separator).
  // Display only: `onWrite` still gets them.
  let heldBlanks = 0;
  let reply = "";
  // A blank line asked for by `separate()`, not yet in the history. Ink's <Static> drops a
  // render whose only new item is a blank line (confirmed with ink-testing-library: the
  // separator before a turn never reached the screen), so a separator always goes into the
  // history together with the line after it, and until then is drawn as a margin above
  // the live area (the prompt, the spinner or the reply in progress).
  let gapPending = false;

  function lastIsBlank(items: HistoryItem[]): boolean {
    const last = items.at(-1);
    return !last || isBlank(last.text);
  }

  function append(items: HistoryItem[], lines: { text: string; kind: OutputKind }[]): HistoryItem[] {
    const next = [...items];
    const push = (text: string): void => void next.push({ id: nextId++, text });
    for (const { text, kind } of lines) {
      if (isBlank(text)) {
        heldBlanks++;
        continue;
      }
      if (gapPending || (lastKind !== null && kind !== lastKind)) {
        if (!lastIsBlank(next)) push("");
      } else {
        for (let i = 0; i < heldBlanks; i++) push("");
      }
      gapPending = false;
      heldBlanks = 0;
      push(text);
      lastKind = kind;
    }
    return next;
  }

  /** A blank line is due above the live area: a pending separator, or a reply starting another kind. */
  function liveGap(): boolean {
    if (gapPending) return true;
    return !isBlank(buffer.partial) && lastKind !== null && partialKind !== lastKind && !lastIsBlank(snapshot.items);
  }

  const renderer = createConsoleRenderer({
    formatAction,
    agentLabel: options.agentLabel,
    output: (text) => {
      // A line belongs to the kind it started with: the first line this write completes
      // may have been started by an earlier write of another kind.
      const firstKind = isBlank(buffer.partial) ? currentKind : partialKind;
      const lines = buffer.push(text);
      const restKind = lines.length > 0 ? currentKind : firstKind;
      const rows = options.width ? buffer.wrap(options.width()) : [];
      const tagged = [
        ...lines.map((line, i) => ({ text: line, kind: i === 0 ? firstKind : currentKind })),
        ...rows.map((row) => ({ text: row, kind: restKind })),
      ];
      partialKind = restKind;
      const items = tagged.length > 0 ? append(snapshot.items, tagged) : snapshot.items;
      snapshot = { ...snapshot, items };
      update({ live: buffer.partial, liveGap: liveGap() });
    },
    onWrite: options.onWrite,
  });

  return {
    renderer,
    render(event: AgentEvent): void {
      if (event.type === "text") reply += event.text;
      currentKind = EVENT_KINDS[event.type];
      renderer.render(event);
      if (event.type === "action") update({ activity: formatAction(event.toolName, event.input), subagentActivity: null });
      else if (event.type === "subagent-action") update({ subagentActivity: formatAction(event.toolName, event.input) });
      else if (event.type === "turn-end") update({ turns: snapshot.turns + 1, usage: event.usage ?? snapshot.usage });
    },
    writeLine(text: string, kind: OutputKind = "notice"): void {
      currentKind = kind;
      renderer.writeLine(text);
    },
    note(text: string, kind: OutputKind = "note"): void {
      const items = append(snapshot.items, text.split("\n").map((line) => ({ text: line, kind })));
      update({ items, liveGap: liveGap() });
    },
    separate(): void {
      heldBlanks = 0;
      if (!lastIsBlank(snapshot.items)) gapPending = true;
      update({ liveGap: liveGap() });
    },
    startTurn(): void {
      reply = "";
      renderer.startTurn();
      update({ busy: true, activity: null, subagentActivity: null });
    },
    endTurn(): void {
      renderer.endLine();
      heldBlanks = 0;
      update({ busy: false, activity: null, subagentActivity: null });
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    lastReply: () => reply.trim(),
  };
}
