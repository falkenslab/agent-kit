import pc from "picocolors";

/**
 * A color for one role of the theme: a color name (`"gray"`, `"cyanBright"`: picocolors' and
 * Ink's names), a hex (`"#ff8800"`), or a function that styles the text itself (bold, a
 * background...). Roles drawn by Ink props (`border`, `selection`, the panels' `accent`) need
 * a name or a hex: a function there falls back to the default color.
 */
export type ThemeColor = string | ((text: string) => string);

/** The terminal UI's colors, by what they're for. */
export interface Theme {
  /** The agent's replies and its label. */
  agent: ThemeColor;
  /** The human's prompt label. */
  user: ThemeColor;
  /** The background of the human's lines in the Ink chat (a name or a hex). */
  userBar: ThemeColor;
  /** The border of the approval and manual-intervention panels (a name or a hex). */
  accent: ThemeColor;
  /** The spinner with what the agent is doing, and the mode in the status bar. */
  working: ThemeColor;
  /** Inline code and code blocks in the agent's replies. */
  code: ThemeColor;
  /** The `●` before each tool call. */
  toolBullet: ThemeColor;
  /** A tool call's label (`● Reading notes.md`). */
  toolLabel: ThemeColor;
  /** The one-line result under a tool call (`⎿ …`); an error is `error` instead. */
  toolResult: ThemeColor;
  /** The focused option of a choice list (approval panels, /resume, the wizard), in bold. */
  selection: ThemeColor;
  /** The frame around the prompt and the /resume list. */
  border: ThemeColor;
  /** Secondary text: notices, summaries, hints. */
  dim: ThemeColor;
  /** Titles (checkpoints, the wizard's questions). */
  heading: ThemeColor;
  /** The plain console's `[action]` lines. */
  action: ThemeColor;
  success: ThemeColor;
  warn: ThemeColor;
  error: ThemeColor;
}

/** The kit's own look. */
export const DEFAULT_THEME: Readonly<Theme> = {
  agent: "cyanBright",
  user: "white",
  userBar: "#373737",
  accent: "#d77757",
  working: "#89b4fa",
  code: "#b1b9f9",
  toolBullet: "green",
  toolLabel: (text) => pc.dim(text),
  toolResult: (text) => pc.dim(text),
  selection: "#d77757",
  border: "gray",
  dim: (text) => pc.dim(text),
  heading: (text) => pc.bold(text),
  action: "magenta",
  success: "green",
  warn: "yellow",
  error: "red",
};

// One theme per process, like the language (ADR-019).
let current: Theme = { ...DEFAULT_THEME };

/** The kit's default theme with `overrides` on top: only the roles given change. */
export function setTheme(overrides: Partial<Theme> = {}): void {
  current = { ...DEFAULT_THEME, ...overrides };
}

export function getTheme(): Readonly<Theme> {
  return current;
}

/** Changes the theme when an entry point was given one; without it, keeps the current one. */
export function applyTheme(overrides: Partial<Theme> | undefined): void {
  if (overrides) setTheme(overrides);
}

const HEX = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const COLORS = pc.createColors(true);
const NAMES = new Set(Object.keys(pc).filter((key) => typeof (pc as unknown as Record<string, unknown>)[key] === "function" && key !== "createColors"));

/**
 * `text` in `color`: a function is applied as given; a name or a hex becomes the terminal's
 * escape codes, or nothing when the terminal has no color (`enabled`). `background` for a
 * background color (a name becomes its `bg` form).
 */
export function paint(color: ThemeColor, text: string, options: { background?: boolean; enabled?: boolean } = {}): string {
  if (typeof color === "function") return color(text);
  const enabled = options.enabled ?? pc.isColorSupported;
  if (!enabled) return text;
  const hex = HEX.exec(color);
  if (hex) {
    const [r, g, b] = hex.slice(1).map((part) => parseInt(part, 16));
    return options.background ? `\x1b[48;2;${r};${g};${b}m${text}\x1b[49m` : `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
  }
  const name = options.background ? `bg${color.charAt(0).toUpperCase()}${color.slice(1)}` : color;
  if (!NAMES.has(name)) return text;
  return COLORS[name as "red"](text);
}

/** A role's color as an Ink prop (a name or a hex); a function falls back to the default's. */
export function inkColor(role: "accent" | "border" | "selection"): string {
  const color = current[role];
  return typeof color === "string" ? color : (DEFAULT_THEME[role] as string);
}
