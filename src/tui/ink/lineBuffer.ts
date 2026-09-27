import wrapAnsi from "wrap-ansi";

// eslint-disable-next-line no-control-regex -- \x1b is the ESC byte SGR sequences start with, not an accident
const SGR = /\x1b\[([0-9;]*)m/g;

// Which attribute each picocolors code opens, and which attributes each code closes.
const OPENS: Record<string, string> = {};
for (const code of [30, 31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]) OPENS[code] = "fg";
for (const code of [40, 41, 42, 43, 44, 45, 46, 47, 100, 101, 102, 103, 104, 105, 106, 107]) OPENS[code] = "bg";
Object.assign(OPENS, { 1: "bold", 2: "dim", 3: "italic", 4: "underline", 7: "inverse", 8: "hidden", 9: "strike" });
const CLOSES: Record<string, string[]> = {
  39: ["fg"],
  49: ["bg"],
  22: ["bold", "dim"],
  23: ["italic"],
  24: ["underline"],
  27: ["inverse"],
  28: ["hidden"],
  29: ["strike"],
};

/** The SGR codes still open at the end of `text`, as a prefix that reopens them. */
function openStyles(text: string): string {
  const active = new Map<string, string>();
  for (const match of text.matchAll(SGR)) {
    for (const code of (match[1] || "0").split(";")) {
      if (code === "0" || code === "") active.clear();
      else if (OPENS[code]) active.set(OPENS[code], code);
      else for (const attribute of CLOSES[code] ?? []) active.delete(attribute);
    }
  }
  return [...active.values()].map((code) => `\x1b[${code}m`).join("");
}

export function stripAnsi(text: string): string {
  return text.replace(SGR, "");
}

export interface LineBuffer {
  /** Appends `text`; returns the lines it completed, each self-contained in its colors. */
  push(text: string): string[];
  /** The line still being written (e.g. a reply mid-stream), with its colors reopened. */
  readonly partial: string;
  /**
   * Cuts the line in progress into rows of at most `width` columns, at word boundaries,
   * and returns every full row, leaving only the last one in progress.
   */
  wrap(width: number): string[];
}

/**
 * Splits the console renderer's output into whole lines, for Ink's `<Static>`, plus the
 * line in progress, for the live area. A streamed reply is colored per delta, and a delta
 * often spans a newline, so a split line would leave its color open on one side and lost
 * on the other: each completed line is closed with a reset and the next one reopens
 * whatever was still active.
 *
 * `wrap()` exists because Ink redraws the live area by erasing as many rows as it believes
 * it drew. A line in progress that reaches the terminal's edge can take one row more than
 * Ink computed, and every redraw then leaves a stale copy of it behind (seen on Windows: a
 * streamed reply repeated once per spinner frame; likely the console wrapping as soon as the
 * last column is written, or drawing some emoji wider). Rows cut short of the edge don't.
 */
export function createLineBuffer(): LineBuffer {
  let partial = "";

  return {
    push(text: string): string[] {
      const parts = (partial + text).split("\n");
      partial = parts.pop() ?? "";
      const lines: string[] = [];
      let carry = "";
      for (const part of parts) {
        const line = carry + part;
        carry = openStyles(line);
        lines.push(carry ? `${line}\x1b[0m` : line);
      }
      if (lines.length > 0) partial = carry + partial;
      return lines;
    },
    get partial() {
      return partial;
    },
    wrap(width: number): string[] {
      // trim: false keeps the space a row ends on, which the next streamed word needs.
      const rows = wrapAnsi(partial, width, { hard: true, trim: false }).split("\n");
      if (rows.length <= 1) return [];
      partial = rows.pop() ?? "";
      return rows;
    },
  };
}

/** `text` on one row of at most `width` columns, cut with "…" when it doesn't fit. */
export function fitWidth(text: string, width: number): string {
  const rows = wrapAnsi(text, Math.max(1, width - 1), { wordWrap: false, trim: false }).split("\n");
  return rows.length > 1 ? `${rows[0]}…` : rows[0];
}
