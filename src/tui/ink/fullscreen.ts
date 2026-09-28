import sliceAnsi from "slice-ansi";
import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";
import { stripAnsi } from "./lineBuffer.js";
import * as ui from "../ui.js";

// Alternate screen plus mouse reporting in SGR form: button events with drags (?1002h), so
// the wheel scrolls and dragging selects text (see the feature ink-selection).
const ENTER = "\x1b[?1049h\x1b[?1000h\x1b[?1002h\x1b[?1006h";
// Back to the normal screen, which brings back what was there before; then clear it and
// put the cursor at the top, keeping the scrollback (like `cls` / `clear`).
const LEAVE = "\x1b[?1002l\x1b[?1000l\x1b[?1006l\x1b[?1049l\x1b[2J\x1b[H";

/**
 * Switches `stream` to the full screen and returns the function that restores it. The
 * restore runs once, whichever comes first: the caller, or the process exiting (an
 * uncaught error, `process.exit()`), since a terminal left in the alternate screen with
 * mouse reporting on is unusable until reset.
 */
export function enterFullscreen(stream: NodeJS.WriteStream): () => void {
  stream.write(ENTER);
  let restored = false;
  const restore = (): void => {
    if (restored) return;
    restored = true;
    process.off("exit", restore);
    stream.write(LEAVE);
  };
  process.on("exit", restore);
  return restore;
}

// An SGR mouse report as Ink hands it to useInput: "[<button;x;yM" (press, or drag) or
// "...m" (release), with or without the leading ESC; x and y are 1-based cells. Wheel up is
// button 64, wheel down 65; the left button is 0, and 32 is added while it drags.
// eslint-disable-next-line no-control-regex -- \x1b is the ESC byte the report may start with
const MOUSE_REPORT = /\x1b?\[<(\d+);(\d+);(\d+)([Mm])/g;

export interface MouseEvent {
  kind: "press" | "drag" | "release" | "wheel-up" | "wheel-down" | "other";
  /** 0-based column and row of the cell. */
  x: number;
  y: number;
}

/** The left-button presses, drags and releases and the wheel steps in `input`, in order. */
export function mouseEvents(input: string): MouseEvent[] {
  return [...input.matchAll(MOUSE_REPORT)].map((match) => {
    const button = Number(match[1]);
    const x = Number(match[2]) - 1;
    const y = Number(match[3]) - 1;
    const kind: MouseEvent["kind"] =
      button === 64 ? "wheel-up"
      : button === 65 ? "wheel-down"
      : button === 0 && match[4] === "m" ? "release"
      : button === 0 ? "press"
      : button === 32 ? "drag"
      : "other";
    return { kind, x, y };
  });
}

/** True when `input` is only mouse reports (clicks, wheel), never text to type. */
export function isMouseReport(input: string): boolean {
  return input.length > 0 && input.replace(MOUSE_REPORT, "") === "";
}

/** Wheel movement in `input`: negative scrolls up, positive down, 0 if none. */
export function wheelSteps(input: string): number {
  let steps = 0;
  for (const match of input.matchAll(MOUSE_REPORT)) {
    if (match[1] === "64") steps--;
    else if (match[1] === "65") steps++;
  }
  return steps;
}

export interface WrappedRows {
  rows: string[];
  /** Whether each row continues the line of the row before it (it was wrapped there). */
  continued: boolean[];
}

/** A history line as the row cache needs it (see sessionModel.ts's HistoryItem). */
export interface RowSource {
  text: string;
  kind?: string;
  expanded?: string[];
}

/**
 * The human's line as a full-width gray bar, bold, as in the Claude Code CLI: wrapped to
 * `width` and each row padded in columns, so the bar is even whatever the text holds.
 */
export function userBarRows(text: string, width: number): string[] {
  return wrapAnsi(text, Math.max(1, width - 1), { hard: true, trim: false })
    .split("\n")
    .map((row) => ui.userBar(ui.bold(` ${row}${" ".repeat(Math.max(0, width - 1 - stringWidth(stripAnsi(row))))}`)));
}

/**
 * The history's rows, wrapped to `width`, with a cache that only wraps the lines added
 * since the last call: the history only grows, and re-wrapping every line on every frame
 * (up to 30 a second while a reply streams) would get slow in a long session. A different
 * width, a change of `expand` (Ctrl+O), or a history that didn't just grow, wraps
 * everything again. Tool groups show their unfolded lines when `expand` is on, and the
 * human's lines are drawn as bars.
 */
export function createRowCache() {
  let cachedWidth = -1;
  let cachedExpand = false;
  let cachedLines: readonly RowSource[] = [];
  let result: WrappedRows = { rows: [], continued: [] };

  return (lines: readonly RowSource[], width: number, expand = false): WrappedRows => {
    const grew =
      width === cachedWidth &&
      expand === cachedExpand &&
      lines.length >= cachedLines.length &&
      lines[cachedLines.length - 1] === cachedLines.at(-1);
    const fresh = grew ? lines.slice(cachedLines.length) : lines;
    const rows: string[] = [];
    const continued: boolean[] = [];
    for (const line of fresh) {
      const texts = expand && line.expanded ? line.expanded : [line.text];
      for (const text of texts) {
        const wrapped = line.kind === "user" ? userBarRows(text, width) : wrapAnsi(text, width, { hard: true, trim: false }).split("\n");
        wrapped.forEach((row, i) => {
          rows.push(row);
          continued.push(i > 0);
        });
      }
    }
    result = grew ? { rows: result.rows.concat(rows), continued: result.continued.concat(continued) } : { rows, continued };
    cachedWidth = width;
    cachedExpand = expand;
    cachedLines = lines;
    return result;
  };
}

/** A cell of the history: a row index and a 0-based column. */
export interface Cell {
  row: number;
  col: number;
}

/** A selection from where the drag started to where it is now, in either order. */
export interface Selection {
  anchor: Cell;
  focus: Cell;
}

/** The selection's first and last cells, in reading order. */
export function orderedCells({ anchor, focus }: Selection): [Cell, Cell] {
  const anchorFirst = anchor.row < focus.row || (anchor.row === focus.row && anchor.col <= focus.col);
  return anchorFirst ? [anchor, focus] : [focus, anchor];
}

/** Columns [from, to) of `row` inside the selection, or null if the row is outside it. */
export function selectedColumns(selection: Selection, row: number, rowWidth: number): [number, number] | null {
  const [first, last] = orderedCells(selection);
  if (row < first.row || row > last.row) return null;
  const from = row === first.row ? first.col : 0;
  const to = row === last.row ? last.col + 1 : rowWidth;
  return from < to ? [from, Math.min(to, Math.max(from, rowWidth))] : null;
}

/** `row` with the selected columns drawn in inverse video. */
export function highlightRow(row: string, selection: Selection | null, index: number): string {
  if (!selection) return row;
  const columns = selectedColumns(selection, index, stringWidth(stripAnsi(row)));
  if (!columns) return row;
  const [from, to] = columns;
  return `${sliceAnsi(row, 0, from)}\x1b[7m${stripAnsi(sliceAnsi(row, from, to))}\x1b[27m${sliceAnsi(row, to)}`;
}

/**
 * The selected text, plain: rows joined with line breaks, except where a row only continues
 * a wrapped line; trailing spaces of each line dropped.
 */
export function selectedText(wrapped: WrappedRows, selection: Selection): string {
  const [first, last] = orderedCells(selection);
  let text = "";
  for (let row = first.row; row <= last.row && row < wrapped.rows.length; row++) {
    const plain = stripAnsi(wrapped.rows[row]);
    const columns = selectedColumns(selection, row, stringWidth(plain));
    const piece = columns ? sliceAnsi(plain, columns[0], columns[1]) : "";
    if (row > first.row && !wrapped.continued[row]) text = `${text.trimEnd()}\n`;
    text += piece;
  }
  return text.trimEnd();
}

/** OSC 52: sets the system clipboard from the terminal (Windows Terminal supports it). */
export function clipboardSequence(text: string): string {
  return `\x1b]52;c;${Buffer.from(text, "utf8").toString("base64")}\x07`;
}

/**
 * Where the history view sits: the index of the last row shown, or null to follow the
 * bottom. Anchoring to a row (not to a distance from the bottom) keeps the view still
 * while new output arrives below it.
 */
export type ScrollAnchor = number | null;

/** The rows [start, end) shown in `height` rows. */
export function visibleRows(total: number, height: number, anchor: ScrollAnchor): [number, number] {
  const end = anchor === null ? total : Math.min(total, anchor + 1);
  return [Math.max(0, end - height), end];
}

/** Moves the view by `delta` rows (negative is up), never above the first page; back to following the bottom once it gets there. */
export function scrollBy(anchor: ScrollAnchor, delta: number, total: number, height: number): ScrollAnchor {
  if (total <= height) return null;
  const current = anchor ?? total - 1;
  const next = Math.min(total - 1, Math.max(height - 1, current + delta));
  return next >= total - 1 ? null : next;
}

/** Rows below the view (0 when following the bottom). */
export function rowsBelow(anchor: ScrollAnchor, total: number): number {
  return anchor === null ? 0 : Math.max(0, total - 1 - anchor);
}
