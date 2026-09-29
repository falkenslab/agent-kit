import type { AgentEvent, SessionUsage } from "../../core/runner.js";
import { createFriendlyToolLabel } from "../../core/toolLabels.js";
import { createConsoleRenderer, type ConsoleRenderer } from "../consoleRenderer.js";
import { fitWidth, stripAnsi } from "./lineBuffer.js";
import { finishedLength, renderMarkdown } from "./markdown.js";
import { toolGroupExpanded, toolGroupSummary, type ToolCall, type ToolPhrase } from "./toolGroup.js";
import * as ui from "../ui.js";
import { t } from "../../core/messages/index.js";

export interface HistoryItem {
  id: number;
  text: string;
  /** What it is: the view draws the human's lines as a bar, and the spacing follows it. */
  kind?: OutputKind;
  /** A folded group of tool calls: the lines it unfolds into with Ctrl+O. */
  expanded?: string[];
}

/**
 * What a block of output is: the human's line, the agent's words, a group of its tool
 * calls, a notice (welcome, info, warnings), an error, or a note (header, checkpoints,
 * the turn summary).
 */
export type OutputKind = "user" | "agent" | "action" | "notice" | "error" | "note";

export interface SessionSnapshot {
  /** Finished lines: in Ink's `<Static>` inline, in the scrollable history in full screen. */
  items: HistoryItem[];
  /** What is still being written, one or more lines: the reply in progress or the open tool group. */
  live: string;
  /** The live block starts a new kind of output: shown with a blank line above it. */
  liveGap: boolean;
  /** A turn is in flight. */
  busy: boolean;
  /** When the turn in flight started (ms), for the spinner's elapsed time. */
  turnStartedAt: number | null;
  /** Label of the main agent's latest action in this turn. */
  activity: string | null;
  /** Label of the latest action taken inside a subagent in this turn. */
  subagentActivity: string | null;
  /** Tool calls shown one by one with their results (the default); Ctrl+O folds them into a summary line. */
  expanded: boolean;
  turns: number;
  usage: SessionUsage | null;
  /** How full the context window is (0-100), after the latest turn; null until known. */
  contextPercent: number | null;
}

export interface SessionModelOptions {
  formatAction?: (toolName: string, toolInput: unknown) => string;
  /** How a tool counts in a folded group's summary ("read 2 files"); built-in tools have their own. */
  toolPhrase?: (toolName: string) => ToolPhrase | undefined;
  agentLabel?: string;
  /** Called with everything the console renderer writes, e.g. to mirror a session log. */
  onWrite?: (text: string) => void;
  /** Columns the live area may use (see liveWidth()); 80 if not given. */
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
  /** The console renderer behind the session log, for writes that aren't events. */
  renderer: ConsoleRenderer;
  render(event: AgentEvent): void;
  /** A line shown and passed to `onWrite` (the log), as the console would print it. */
  writeLine(text: string, kind?: OutputKind): void;
  /** Lines shown in the history but not passed to `onWrite` (the human's line, checkpoints, the header). */
  note(text: string, kind?: OutputKind): void;
  /** One blank line before what comes next (not logged), unless the history is empty or already ends on one. */
  separate(): void;
  startTurn(): void;
  endTurn(): void;
  /** Ctrl+O: folds or unfolds the tool groups. */
  toggleExpanded(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): SessionSnapshot;
  /** The agent's text in the latest turn, plain (for /copy). */
  lastReply(): string;
  setContextPercent(percent: number | null): void;
  /** Empties the history and the counters, for a resumed conversation redrawn from the start. */
  reset(): void;
  /**
   * Draws an earlier conversation (a resumed one): the human's lines as `userLine()` makes
   * them and the agent's replies with their markdown, without passing them to `onWrite`.
   */
  replay(messages: readonly { role: "user" | "assistant"; text: string }[], userLine: (text: string) => string): void;
}

// The reply in progress keeps at most this many rows live; older ones go to the history.
const LIVE_ROWS = 6;
const BULLET = "● ";
const INDENT = "  ";

const isBlank = (line: string): boolean => stripAnsi(line).trim() === "";

/**
 * The state behind the Ink views, in the look of the Claude Code CLI: the agent's words
 * behind a `●` with their markdown rendered, consecutive tool calls folded into one summary
 * line (unfolded with Ctrl+O into `●` calls with `⎿` results), a summary when a turn ends,
 * and one blank line between blocks of different kinds.
 *
 * The screen is built from the events here; the session log still comes from
 * `createConsoleRenderer()` through `onWrite`, so it reads exactly as the plain console
 * (and runChatTui()) would print it.
 */
export function createSessionModel(options: SessionModelOptions = {}): SessionModel {
  const formatAction = options.formatAction ?? createFriendlyToolLabel();
  const width = (): number => Math.max(20, options.width?.() ?? 80);
  const listeners = new Set<() => void>();
  let nextId = 0;
  let snapshot: SessionSnapshot = {
    items: [],
    live: "",
    liveGap: false,
    busy: false,
    turnStartedAt: null,
    activity: null,
    subagentActivity: null,
    expanded: true,
    turns: 0,
    usage: null,
    contextPercent: null,
  };

  function update(changes: Partial<SessionSnapshot>): void {
    snapshot = { ...snapshot, ...changes };
    for (const listener of listeners) listener();
  }

  // The session log: the console renderer's text, never shown here.
  const renderer = createConsoleRenderer({ formatAction, agentLabel: options.agentLabel, output: () => {}, onWrite: options.onWrite });

  let lastKind: OutputKind | null = null;
  // A blank line asked for by `separate()`, not yet in the history. Ink's <Static> drops a
  // render whose only new item is a blank line (confirmed with ink-testing-library), so a
  // separator always goes into the history together with the line after it, and until then
  // is drawn as a margin above the live area.
  let gapPending = false;
  let reply = "";

  // The agent's text since its last tool call: `segmentDone` characters of it already
  // rendered as finished blocks, plus `rowsCommitted` rows of the block still growing
  // (moved out of the live area when it grew past LIVE_ROWS).
  let segment = "";
  let segmentDone = 0;
  let rowsCommitted = 0;
  let segmentShown = false;
  let group: ToolCall[] | null = null;

  function lastIsBlank(items: HistoryItem[]): boolean {
    const last = items.at(-1);
    return !last || isBlank(last.text);
  }

  /** Adds a block's lines, with a blank line before it when the kind of output changes. */
  function push(lines: string[], kind: OutputKind, extra: Partial<HistoryItem> = {}): void {
    const items = [...snapshot.items];
    if (lines.length === 0) return;
    if ((gapPending || (lastKind !== null && kind !== lastKind)) && !lastIsBlank(items)) items.push({ id: nextId++, text: "" });
    gapPending = false;
    lines.forEach((text, i) => items.push({ id: nextId++, text, kind, ...(i === 0 ? extra : {}) }));
    lastKind = kind;
    snapshot = { ...snapshot, items };
  }

  function mdWidth(): number {
    return width() - INDENT.length;
  }

  /** The reply's rows behind its bullet (the segment's first row) or indent (the rest). */
  function decorate(rows: string[]): string[] {
    return rows.map((row) => {
      if (isBlank(row)) return "";
      const prefix = segmentShown ? INDENT : BULLET;
      segmentShown = true;
      return prefix + row;
    });
  }

  /** Renders the finished part of the reply into the history; `final` flushes it all. */
  function flushSegment(final: boolean): string[] {
    const done = final ? segment.length : finishedLength(segment);
    if (done > segmentDone) {
      const rows = renderMarkdown(segment.slice(segmentDone, done), mdWidth()).slice(rowsCommitted);
      // A new block of the same reply is separated by a blank line; the rest of a block
      // whose first rows are already in the history continues right under them.
      const lead = segmentShown && rowsCommitted === 0 && rows.length > 0 ? [""] : [];
      if (rows.some((row) => !isBlank(row))) push([...lead, ...decorate(rows)], "agent");
      segmentDone = done;
      rowsCommitted = 0;
    }
    if (final) {
      segment = "";
      segmentDone = 0;
      rowsCommitted = 0;
      segmentShown = false;
      return [];
    }
    const rest = segment.slice(segmentDone);
    if (!rest.trim()) return [];
    const rows = renderMarkdown(rest, mdWidth());
    const overflow = rows.length - rowsCommitted - LIVE_ROWS;
    if (overflow > 0) {
      const lead = segmentShown && rowsCommitted === 0 ? [""] : [];
      push([...lead, ...decorate(rows.slice(rowsCommitted, rowsCommitted + overflow))], "agent");
      rowsCommitted += overflow;
    }
    // Live rows get their bullet/indent without marking the segment as shown yet.
    const shown = segmentShown;
    const live = decorate(rows.slice(rowsCommitted));
    segmentShown = shown;
    return live;
  }

  function closeGroup(): void {
    if (!group) return;
    const calls = group;
    group = null;
    push([groupLine(calls)], "action", { expanded: toolGroupExpanded(calls, width()) });
  }

  function groupLine(calls: ToolCall[]): string {
    return INDENT + ui.dim(fitWidth(toolGroupSummary(calls, options.toolPhrase), width() - INDENT.length));
  }

  /** Ends whatever is open (the reply in progress, a tool group) into the history. */
  function closeAll(): void {
    flushSegment(true);
    closeGroup();
  }

  /** Recomputes the live area from what is open. */
  function refreshLive(liveRows: string[] = []): void {
    let rows = liveRows;
    let kind: OutputKind | null = liveRows.length > 0 ? "agent" : null;
    if (group) {
      rows = snapshot.expanded ? toolGroupExpanded(group, width()) : [groupLine(group)];
      kind = "action";
    }
    const live = rows.join("\n");
    const liveGap = gapPending || (kind !== null && lastKind !== null && kind !== lastKind && !lastIsBlank(snapshot.items));
    update({ live, liveGap });
  }

  return {
    renderer,
    render(event: AgentEvent): void {
      renderer.render(event);
      switch (event.type) {
        case "text": {
          reply += event.text;
          closeGroup();
          segment += event.text;
          refreshLive(flushSegment(false));
          return;
        }
        case "action": {
          flushSegment(true);
          group ??= [];
          group.push({ id: event.toolUseId, label: formatAction(event.toolName, event.input), toolName: event.toolName, result: null });
          snapshot = { ...snapshot, activity: formatAction(event.toolName, event.input), subagentActivity: null };
          refreshLive();
          return;
        }
        case "tool-result": {
          const call = group?.find((c) => c.id === event.toolUseId);
          if (call) call.result = { isError: event.isError, text: event.text };
          refreshLive();
          return;
        }
        case "subagent-action": {
          const label = formatAction(event.toolName, event.input);
          const parent = group?.find((c) => c.id !== undefined && c.id === event.parentToolUseId);
          if (parent) parent.children = [...(parent.children ?? []), label];
          snapshot = { ...snapshot, subagentActivity: label };
          refreshLive();
          return;
        }
        case "mcp-error":
          closeAll();
          push([ui.warn(t().mcpFailed(event.failedServers.join(", ")))], "notice");
          refreshLive();
          return;
        case "info":
          closeAll();
          push([(event.level === "warning" ? ui.warn : ui.dim)(`(${event.text})`)], "notice");
          refreshLive();
          return;
        case "turn-end":
          closeAll();
          if (event.failed && event.errorText) push([ui.error(event.errorText)], "error");
          snapshot = { ...snapshot, turns: snapshot.turns + 1, usage: event.usage ?? snapshot.usage };
          refreshLive();
          return;
        case "prompt-suggestion":
          return;
      }
    },
    writeLine(text: string, kind: OutputKind = "notice"): void {
      closeAll();
      renderer.writeLine(text);
      push(text.split("\n"), kind);
      refreshLive();
    },
    note(text: string, kind: OutputKind = "note"): void {
      closeAll();
      push(text.split("\n"), kind);
      refreshLive();
    },
    separate(): void {
      if (!lastIsBlank(snapshot.items)) gapPending = true;
      refreshLive();
    },
    startTurn(): void {
      reply = "";
      renderer.startTurn();
      update({ busy: true, turnStartedAt: Date.now(), activity: null, subagentActivity: null });
    },
    endTurn(): void {
      closeAll();
      renderer.endLine();
      const started = snapshot.turnStartedAt;
      if (started !== null) {
        const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
        push([ui.dim(`✻ ${t().workedFor(seconds)}`)], "note");
      }
      snapshot = { ...snapshot, busy: false, turnStartedAt: null, activity: null, subagentActivity: null };
      refreshLive();
    },
    toggleExpanded(): void {
      snapshot = { ...snapshot, expanded: !snapshot.expanded };
      refreshLive();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    lastReply: () => reply.trim(),
    setContextPercent: (percent) => update({ contextPercent: percent }),
    reset(): void {
      closeAll();
      lastKind = null;
      gapPending = false;
      reply = "";
      snapshot = { ...snapshot, items: [], live: "", liveGap: false, turns: 0, usage: null, contextPercent: null };
      refreshLive();
    },
    replay(messages, userLine): void {
      closeAll();
      for (const message of messages) {
        if (!lastIsBlank(snapshot.items)) gapPending = true;
        if (message.role === "user") {
          push(userLine(message.text).split("\n"), "user");
        } else {
          segment = message.text;
          flushSegment(true);
        }
      }
      snapshot = { ...snapshot, turns: snapshot.turns + messages.filter((message) => message.role === "user").length };
      refreshLive();
    },
  };
}
