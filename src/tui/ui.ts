import pc from "picocolors";
import { getTheme, paint } from "./theme.js";

/**
 * Color palette for a consistent console look across whatever CLI is built on this kit.
 * Each function draws its role in the current theme (see theme.ts), so an agent's theme
 * reaches everything that uses them, its own texts included.
 */
export const agent = (s: string): string => paint(getTheme().agent, s);
export const user = (s: string): string => paint(getTheme().user, s);
export const action = (s: string): string => paint(getTheme().action, s);
export const heading = (s: string): string => paint(getTheme().heading, s);
export const success = (s: string): string => paint(getTheme().success, s);
export const warn = (s: string): string => paint(getTheme().warn, s);
export const error = (s: string): string => paint(getTheme().error, s);
export const dim = (s: string): string => paint(getTheme().dim, s);

// The Claude Code-like look of the Ink views (see the feature ink-claude-style).
/** The accent (the approval panels' border). */
export const accent = (s: string): string => paint(getTheme().accent, s);
/** The spinner and what the agent is doing. */
export const working = (s: string): string => paint(getTheme().working, s);
/** Inline code and code blocks. */
export const code = (s: string): string => paint(getTheme().code, s);
/** The background of the human's lines. */
export const userBar = (s: string): string => paint(getTheme().userBar, s, { background: true });
export const toolBullet = (s: string): string => paint(getTheme().toolBullet, s);
/** A tool call's label. */
export const toolLabel = (s: string): string => paint(getTheme().toolLabel, s);
/** The one-line result under a tool call. */
export const toolResult = (s: string): string => paint(getTheme().toolResult, s);
export const bold = (s: string): string => pc.bold(s);
export const italic = (s: string): string => pc.italic(s);
export const strike = (s: string): string => pc.strikethrough(s);
