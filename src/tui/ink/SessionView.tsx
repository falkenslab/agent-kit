import { useEffect, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Box, measureElement, Static, Text, useInput, useStdout, type DOMElement } from "ink";
import { Select } from "@inkjs/ui";
import type { ApprovalPrompt } from "../../core/interaction.js";
import type { Mode } from "../../core/agentSpec.js";
import type { SessionUsage } from "../../core/runner.js";
import { liveWidth, type HistoryItem, type SessionModel, type SessionSnapshot } from "./sessionModel.js";
import {
  createRowCache,
  highlightRow,
  isMouseReport,
  mouseEvents,
  rowsBelow,
  scrollBy,
  selectedText,
  visibleRows,
  type Cell,
  type ScrollAnchor,
  type Selection,
  userBarRows,
} from "./fullscreen.js";
import { framePosition } from "./terminalCursor.js";
import { isFocusReport } from "./terminalStatus.js";
import type { Checkpoint, InkInteraction } from "./inkInteraction.js";
import { fitWidth, stripAnsi } from "./lineBuffer.js";
import * as ui from "../ui.js";

/** Replaces the default preview (title and lines) of an approval panel; the choices stay. */
export type RenderApproval = (prompt: ApprovalPrompt) => ReactNode;

// Numbered as in the Claude Code CLI's permission prompt; the digits and y/n/q answer too.
const DECISION_OPTIONS = [
  { label: "1. Yes", value: "y" },
  { label: "2. No", value: "n" },
  { label: "3. Stop", value: "q" },
];
const MANUAL_OPTIONS = [{ label: "1. Done, continue", value: "continue" }];
const DECISION_KEYS: Record<string, string> = { "1": "y", "2": "n", "3": "q", y: "y", n: "n", q: "q" };
const ACCENT_HEX = "#d77757";

/**
 * The preview's lines, capped so the whole live area stays shorter than the terminal: Ink
 * clears the entire screen (scrollback included) to redraw anything taller, and a step-gate
 * preview carries the tool's parameters, which can be a whole file.
 */
export function previewLines(lines: readonly string[], terminalRows: number | undefined): string[] {
  const all = lines.flatMap((line) => line.split("\n"));
  const max = Math.max(3, (terminalRows || 24) - 12);
  return all.length <= max ? all : [...all.slice(0, max - 1), ui.dim(`… (${all.length - max + 1} more lines)`)];
}

function CheckpointPanel({ checkpoint, renderApproval }: { checkpoint: Checkpoint; renderApproval?: RenderApproval }) {
  const decision = checkpoint.kind === "decision";
  useInput((input) => {
    const key = input.toLowerCase();
    if (decision && DECISION_KEYS[key]) checkpoint.answer(DECISION_KEYS[key]);
    else if (!decision && key === "1") checkpoint.answer("");
  });

  const { prompt } = checkpoint;
  const { stdout } = useStdout();
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={ACCENT_HEX} paddingX={1}>
      {renderApproval ? (
        renderApproval(prompt)
      ) : (
        <>
          <Text bold>{prompt.title}</Text>
          {previewLines(prompt.lines, stdout.rows).map((line, index) => (
            <Text key={index}>{line}</Text>
          ))}
          {!decision && prompt.question ? <Text dimColor>{prompt.question}</Text> : null}
        </>
      )}
      {decision ? (
        <Box marginTop={1}>
          <Text>Do you want to proceed?</Text>
        </Box>
      ) : null}
      <Box marginTop={decision ? 0 : 1}>
        <Select
          key={checkpoint.id}
          options={decision ? DECISION_OPTIONS : MANUAL_OPTIONS}
          onChange={(value) => checkpoint.answer(decision ? value : "")}
        />
      </Box>
    </Box>
  );
}

function formatTokens(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

export function statusText(
  mode: Mode | undefined,
  turns: number,
  usage: SessionUsage | null,
  extra: { contextPercent?: number | null; modeSwitchable?: boolean } = {},
): string {
  const parts = [
    ...(mode ? [`⏵⏵ ${mode}${extra.modeSwitchable ? " (shift+tab)" : ""}`] : []),
    `${turns} ${turns === 1 ? "turn" : "turns"}`,
    ...(usage ? [`${formatTokens(usage.inputTokens)} in / ${formatTokens(usage.outputTokens)} out`] : []),
    ...(extra.contextPercent != null ? [`context ${Math.round(extra.contextPercent)}%`] : []),
  ];
  return parts.join(" · ");
}

export interface SessionViewProps {
  model: SessionModel;
  interaction: InkInteraction;
  renderApproval?: RenderApproval;
  mode?: Mode;
  /** Leaves only the history, so the last frame Ink leaves on screen is just the scrollback. */
  closed?: boolean;
  /**
   * Draws the whole terminal: the history in a scrollable view above the live area, instead
   * of in the terminal's own scrollback. The caller switches the terminal to the alternate
   * screen (see fullscreen.ts's enterFullscreen()).
   */
  fullscreen?: boolean;
  /** Full screen only: lines pinned above the history (see header.ts's headerLines()). */
  header?: string[];
  /** Full screen only: receives the text selected with the mouse (e.g. to set the clipboard). */
  onCopy?: (text: string) => void;
  /** The mode can be switched (Shift+Tab): the status bar says so. */
  modeSwitchable?: boolean;
  /** Shown under the live area when no checkpoint is waiting (the chat's input). */
  children?: ReactNode;
}

interface LiveAreaProps {
  session: SessionSnapshot;
  checkpoint: Checkpoint | null;
  renderApproval?: RenderApproval;
  mode?: Mode;
  width: number;
  /** Appended to the status bar, e.g. the scroll position in full screen. */
  statusExtra?: string;
  /** The mode can be switched (Shift+Tab): the status bar says so. */
  modeSwitchable?: boolean;
  children?: ReactNode;
}

// No emoji-capable characters: Windows Terminal draws ✳ (U+2733) as a green emoji.
const WORKING_GLYPHS = ["·", "✢", "✱", "✶", "✻", "✽", "✻", "✶", "✱", "✢"];

/** The spinner line, as in the Claude Code CLI: an animated glyph, what it's doing, how long it's been at it. */
function Working({ label, startedAt, width }: { label: string; startedAt: number | null; width: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 120);
    return () => clearInterval(timer);
  }, []);
  const seconds = startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
  const glyph = WORKING_GLYPHS[tick % WORKING_GLYPHS.length];
  return <Text>{fitWidth(`${ui.working(`${glyph} ${label}`)} ${ui.dim(`(${seconds}s · esc to interrupt)`)}`, width)}</Text>;
}

/** Line in progress, checkpoint panel or spinner, the input, and the status bar. */
function LiveArea({ session, checkpoint, renderApproval, mode, width, statusExtra, modeSwitchable, children }: LiveAreaProps) {
  // The mode in orange, as in the Claude Code CLI's footer; the rest dim.
  const plain = statusText(mode, session.turns, session.usage, { contextPercent: session.contextPercent, modeSwitchable }) + (statusExtra ? ` · ${statusExtra}` : "");
  const cut = mode ? plain.indexOf(" · ") : -1;
  const status = cut > 0 ? ui.accent(plain.slice(0, cut)) + ui.dim(plain.slice(cut)) : ui.dim(plain);
  return (
    <Box flexDirection="column" flexShrink={0} width={width} marginTop={session.liveGap ? 1 : 0}>
      {stripAnsi(session.live) ? <Text>{session.live}</Text> : null}
      {checkpoint ? (
        <CheckpointPanel checkpoint={checkpoint} renderApproval={renderApproval} />
      ) : session.busy ? (
        // Always one blank line above the spinner: from this margin, or from the live area's
        // own when a separator is pending and nothing is written above the spinner yet.
        <Box flexDirection="column" marginTop={stripAnsi(session.live) || !session.liveGap ? 1 : 0}>
          <Working label={session.activity ?? "Thinking…"} startedAt={session.turnStartedAt} width={width} />
          {session.subagentActivity ? <Text dimColor>{fitWidth(`  ↳ ${session.subagentActivity}`, width)}</Text> : null}
        </Box>
      ) : null}
      {checkpoint ? null : children}
      <Text>{fitWidth(status, width)}</Text>
    </Box>
  );
}

/** A history line for the inline view: the human's line as a bar, a tool group unfolded with Ctrl+O. */
function inlineItem(item: HistoryItem, expanded: boolean, width: number): string {
  if (item.kind === "user") return userBarRows(item.text, width).join("\n");
  if (expanded && item.expanded) return item.expanded.join("\n");
  return item.text || " ";
}

/** The terminal's size, re-read on resize (Ink re-lays out on resize but doesn't re-render components). */
function useTerminalSize(): { columns: number; rows: number } {
  const { stdout } = useStdout();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    stdout.on("resize", rerender);
    return () => void stdout.off("resize", rerender);
  }, [stdout]);
  return { columns: stdout.columns || 80, rows: stdout.rows || 24 };
}

const WHEEL_ROWS = 3;

/**
 * The full-screen layout: a frame exactly as tall as the terminal (so Ink redraws it whole
 * from the top every time, never relative to where it thinks the cursor is — a shorter frame
 * left stale copies behind on Windows Terminal) and one column narrower. The history fills
 * what the live area leaves, bottom-aligned, and scrolls on its own: PageUp/PageDown and the
 * wheel move it, Ctrl+End or typing brings it back to the bottom, and output arriving while
 * scrolled up doesn't move it.
 */
function FullscreenSession({
  session,
  checkpoint,
  renderApproval,
  mode,
  header,
  onCopy,
  modeSwitchable,
  children,
}: Omit<LiveAreaProps, "width" | "statusExtra"> & { header?: string[]; onCopy?: (text: string) => void }) {
  const { columns, rows } = useTerminalSize();
  const width = liveWidth(columns);
  const rowCache = useRef(createRowCache()).current;
  const wrapped = rowCache(session.items, width, session.expanded);
  const total = wrapped.rows.length;

  const historyRef = useRef<DOMElement>(null);
  const [historyHeight, setHistoryHeight] = useState(rows);
  useEffect(() => {
    if (!historyRef.current) return;
    const { height } = measureElement(historyRef.current);
    if (height !== historyHeight) setHistoryHeight(height);
  });

  const [anchor, setAnchor] = useState<ScrollAnchor>(null);
  // Mirrored in a ref: mouse reports can arrive faster than React re-renders.
  const [selection, setSelectionState] = useState<Selection | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  function setSelection(next: Selection | null): void {
    selectionRef.current = next;
    setSelectionState(next);
  }
  const dragging = useRef(false);
  const [copied, setCopied] = useState<string | null>(null);
  // Rows are re-wrapped when the width changes, so a row index no longer means the same
  // place: go back to the bottom, and drop the selection.
  useEffect(() => {
    setAnchor(null);
    setSelection(null);
  }, [width]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  const [start, end] = visibleRows(total, historyHeight, anchor);

  /** The history cell under a screen cell (clamped to the rows shown), or null outside the history. */
  function cellAt(x: number, y: number, clamp: boolean): Cell | null {
    if (!historyRef.current || end === start) return null;
    const box = framePosition(historyRef.current);
    const firstY = box.y + historyHeight - (end - start); // the rows are bottom-aligned
    let offset = y - firstY;
    if (offset < 0 || offset >= end - start) {
      if (!clamp) return null;
      offset = Math.min(end - start - 1, Math.max(0, offset));
    }
    return { row: start + offset, col: Math.max(0, x - box.x) };
  }

  function handleMouse(text: string): void {
    for (const event of mouseEvents(text)) {
      if (event.kind === "wheel-up" || event.kind === "wheel-down") {
        const steps = event.kind === "wheel-up" ? -WHEEL_ROWS : WHEEL_ROWS;
        setAnchor((a) => scrollBy(a, steps, total, historyHeight));
      } else if (event.kind === "press") {
        const cell = cellAt(event.x, event.y, false);
        dragging.current = cell !== null;
        setSelection(cell ? { anchor: cell, focus: cell } : null);
      } else if (event.kind === "drag" && dragging.current && selectionRef.current) {
        const cell = cellAt(event.x, event.y, true);
        if (cell) setSelection({ anchor: selectionRef.current.anchor, focus: cell });
      } else if (event.kind === "release" && dragging.current && selectionRef.current) {
        dragging.current = false;
        const cell = cellAt(event.x, event.y, true);
        const final = cell ? { anchor: selectionRef.current.anchor, focus: cell } : selectionRef.current;
        // A click without a drag clears the selection; a drag leaves it selected.
        setSelection(final.anchor.row === final.focus.row && final.anchor.col === final.focus.col ? null : final);
      } else if (event.kind === "right" && selectionRef.current) {
        // As in Windows Terminal: a right-click copies the selection and clears it.
        const text = selectedText(wrapped, selectionRef.current);
        setSelection(null);
        if (text && onCopy) {
          onCopy(text);
          setCopied(`copied ${text.length} ${text.length === 1 ? "character" : "characters"}`);
        }
      }
    }
  }

  useInput((text, key) => {
    const page = Math.max(1, historyHeight - 1);
    if (isMouseReport(text)) handleMouse(text);
    else if (isFocusReport(text)) return;
    else if (key.pageUp) setAnchor((a) => scrollBy(a, -page, total, historyHeight));
    else if (key.pageDown) setAnchor((a) => scrollBy(a, page, total, historyHeight));
    else if (key.ctrl && key.end) setAnchor(null);
    else if (text && !key.ctrl && !key.meta && !key.escape) setAnchor(null); // typing
  });

  const below = rowsBelow(anchor, total);
  const statusExtra = [anchor === null ? null : `↓ ${below} more ${below === 1 ? "line" : "lines"} (Ctrl+End)`, copied]
    .filter(Boolean)
    .join(" · ");
  return (
    <Box flexDirection="column" width={columns - 1} height={rows}>
      {header && header.length > 0 ? (
        <Box flexDirection="column" flexShrink={0} marginBottom={1}>
          {header.map((line, i) => (
            <Text key={i} wrap="truncate-end">
              {line || " "}
            </Text>
          ))}
        </Box>
      ) : null}
      <Box ref={historyRef} flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden" justifyContent="flex-end">
        {wrapped.rows.slice(start, end).map((row, i) => (
          <Text key={start + i} wrap="truncate-end">
            {highlightRow(row, selection, start + i) || " "}
          </Text>
        ))}
      </Box>
      <LiveArea
        session={session}
        checkpoint={checkpoint}
        renderApproval={renderApproval}
        mode={mode}
        width={width}
        statusExtra={statusExtra || undefined}
        modeSwitchable={modeSwitchable}
      >
        {children}
      </LiveArea>
    </Box>
  );
}

/** History, line in progress, current action, checkpoint panel and status bar. */
export function SessionView({ model, interaction, renderApproval, mode, closed, fullscreen, header, onCopy, modeSwitchable, children }: SessionViewProps) {
  const session = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const checkpoint = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);
  // Nothing in the live area may reach the terminal's edge (see lineBuffer.ts).
  const width = liveWidth(useStdout().stdout.columns);

  if (fullscreen) {
    return closed ? null : (
      <FullscreenSession
        session={session}
        checkpoint={checkpoint}
        renderApproval={renderApproval}
        mode={mode}
        header={header}
        onCopy={onCopy}
        modeSwitchable={modeSwitchable}
      >
        {children}
      </FullscreenSession>
    );
  }
  return (
    <>
      <Static items={session.items}>{(item) => <Text key={item.id}>{inlineItem(item, session.expanded, width)}</Text>}</Static>
      {closed ? null : (
        <LiveArea session={session} checkpoint={checkpoint} renderApproval={renderApproval} mode={mode} width={width} modeSwitchable={modeSwitchable}>
          {children}
        </LiveArea>
      )}
    </>
  );
}
