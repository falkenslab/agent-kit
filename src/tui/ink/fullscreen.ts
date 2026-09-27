import wrapAnsi from "wrap-ansi";

// Alternate screen plus mouse reporting in SGR form (so the wheel reaches us as input).
const ENTER = "\x1b[?1049h\x1b[?1000h\x1b[?1006h";
// Back to the normal screen, which brings back what was there before; then clear it and
// put the cursor at the top, keeping the scrollback (like `cls` / `clear`).
const LEAVE = "\x1b[?1000l\x1b[?1006l\x1b[?1049l\x1b[2J\x1b[H";

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

// An SGR mouse report as Ink hands it to useInput: "[<button;x;yM" (press) or "...m"
// (release), with or without the leading ESC. Wheel up is button 64, wheel down 65.
// eslint-disable-next-line no-control-regex -- \x1b is the ESC byte the report may start with
const MOUSE_REPORT = /\x1b?\[<(\d+);\d+;\d+[Mm]/g;

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

/**
 * The history's rows, wrapped to `width`, with a cache that only wraps the lines added
 * since the last call: the history only grows, and re-wrapping every line on every frame
 * (up to 30 a second while a reply streams) would get slow in a long session. A different
 * width, or a history that didn't just grow, wraps everything again.
 */
export function createRowCache() {
  let cachedWidth = -1;
  let cachedLines: readonly { text: string }[] = [];
  let rows: string[] = [];

  return (lines: readonly { text: string }[], width: number): string[] => {
    const grew = width === cachedWidth && lines.length >= cachedLines.length && lines[cachedLines.length - 1] === cachedLines.at(-1);
    const fresh = grew ? lines.slice(cachedLines.length) : lines;
    const wrapped = fresh.flatMap((line) => wrapAnsi(line.text, width, { hard: true, trim: false }).split("\n"));
    rows = grew ? rows.concat(wrapped) : wrapped;
    cachedWidth = width;
    cachedLines = lines;
    return rows;
  };
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
