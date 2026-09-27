import type { AgentEvent, SessionUsage } from "../../core/runner.js";
import { createFriendlyToolLabel } from "../../core/toolLabels.js";
import { createConsoleRenderer, type ConsoleRenderer } from "../consoleRenderer.js";
import { createLineBuffer, stripAnsi } from "./lineBuffer.js";

export interface HistoryItem {
  id: number;
  text: string;
}

export interface SessionSnapshot {
  /** Finished lines, rendered once in Ink's `<Static>` and left in the scrollback. */
  items: HistoryItem[];
  /** The line still being written, e.g. the agent's reply mid-stream. */
  live: string;
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
  writeLine(text: string): void;
  /** Lines shown in the history but not passed to `onWrite` (checkpoints, the header). */
  note(text: string): void;
  /** One blank line in the history (not logged), unless the history is empty or already ends on one. */
  separate(): void;
  startTurn(): void;
  endTurn(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): SessionSnapshot;
}

/**
 * The state behind the Ink views. Every event goes through `createConsoleRenderer()`, so
 * `onWrite` logs exactly what the plain console shows, and the history reads the same
 * text, spaced for reading: blank lines between turns (`separate()`), none between the
 * agent's words and its actions. Ink only adds what a console can't redraw (the line in
 * progress, a spinner, the status bar).
 */
export function createSessionModel(options: SessionModelOptions = {}): SessionModel {
  const formatAction = options.formatAction ?? createFriendlyToolLabel();
  const buffer = createLineBuffer();
  const listeners = new Set<() => void>();
  let nextId = 0;
  let snapshot: SessionSnapshot = {
    items: [],
    live: "",
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

  function addLines(lines: string[]): HistoryItem[] {
    return [...snapshot.items, ...lines.map((text) => ({ id: nextId++, text }))];
  }

  // Blank lines the reply ended on, held back until something follows them: an action
  // goes right under what the agent said, and a turn ends without trailing blanks, so they
  // are only shown before more text. Display only: `onWrite` still gets them.
  let heldBlanks = 0;
  let droppingBlanks = false;

  function releaseBlanks(): string[] {
    const blanks = droppingBlanks ? [] : Array.from({ length: heldBlanks }, () => "");
    heldBlanks = 0;
    return blanks;
  }

  const renderer = createConsoleRenderer({
    formatAction,
    agentLabel: options.agentLabel,
    output: (text) => {
      const lines = buffer.push(text);
      if (options.width) lines.push(...buffer.wrap(options.width()));
      const shown: string[] = [];
      for (const line of lines) {
        if (stripAnsi(line).trim() === "") heldBlanks++;
        else shown.push(...releaseBlanks(), line);
      }
      update({ items: shown.length > 0 ? addLines(shown) : snapshot.items, live: buffer.partial });
    },
    onWrite: options.onWrite,
  });

  return {
    renderer,
    render(event: AgentEvent): void {
      droppingBlanks = event.type === "action";
      renderer.render(event);
      droppingBlanks = false;
      if (event.type === "action") update({ activity: formatAction(event.toolName, event.input), subagentActivity: null });
      else if (event.type === "subagent-action") update({ subagentActivity: formatAction(event.toolName, event.input) });
      else if (event.type === "turn-end") update({ turns: snapshot.turns + 1, usage: event.usage ?? snapshot.usage });
    },
    writeLine: (text) => renderer.writeLine(text),
    note(text: string): void {
      update({ items: addLines([...releaseBlanks(), ...text.split("\n")]) });
    },
    separate(): void {
      const last = snapshot.items.at(-1);
      if (last && stripAnsi(last.text).trim() !== "") update({ items: addLines([""]) });
    },
    startTurn(): void {
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
  };
}
