import pc from "picocolors";

/** Color palette for a consistent console look across whatever CLI is built on this kit. */
export const agent = (s: string): string => pc.cyanBright(s);
export const user = (s: string): string => pc.white(s);
export const action = (s: string): string => pc.magenta(s);
export const heading = (s: string): string => pc.bold(s);
export const success = (s: string): string => pc.green(s);
export const warn = (s: string): string => pc.yellow(s);
export const error = (s: string): string => pc.red(s);
export const dim = (s: string): string => pc.dim(s);

// The Claude Code-like look of the Ink views (see the feature ink-claude-style), in 24-bit
// color when the terminal supports color at all, like the rest of this palette.
const rgb = (r: number, g: number, b: number) => (s: string): string =>
  pc.isColorSupported ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s;
/** The orange accent: spinner, turn summary, mode. */
export const accent = rgb(215, 119, 87);
/** Inline code and code blocks. */
export const code = rgb(177, 185, 249);
/** The background of the human's lines. */
export const userBar = (s: string): string => (pc.isColorSupported ? `\x1b[48;2;55;55;55m${s}\x1b[49m` : s);
export const bold = (s: string): string => pc.bold(s);
export const italic = (s: string): string => pc.italic(s);
export const strike = (s: string): string => pc.strikethrough(s);
export const toolBullet = (s: string): string => pc.green(s);
