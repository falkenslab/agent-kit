import { createContext } from "react";
import type { DOMElement } from "ink";

/** Where the terminal's cursor goes: `column` columns right of where `node` starts. */
export interface CursorTarget {
  node: DOMElement;
  column: number;
}

export interface CursorController {
  /** The input to put the cursor in, or null to hide it (no input on screen). */
  setTarget(target: CursorTarget | null): void;
  /** Moves the terminal's cursor to the target (after Ink wrote a frame). */
  place(): void;
}

/** Where `node` sits in the frame, from the laid-out Yoga tree (0-based column and row). */
export function framePosition(node: DOMElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let current: DOMElement | undefined = node; current; current = current.parentNode) {
    x += current.yogaNode?.getComputedLeft() ?? 0;
    y += current.yogaNode?.getComputedTop() ?? 0;
  }
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * The terminal's own cursor for the full-screen chat, so it looks like the terminal's (a
 * bar in Windows Terminal's default profile, as in Claude Code) instead of a drawn block.
 * Ink's `useCursor` doesn't fit a frame as tall as the terminal: that redraw path moves the
 * cursor only when its position changes, and one row off (it counts the frame as ending in
 * a newline it doesn't write). A full-screen frame always starts at the top-left corner, so
 * after each one the cursor is simply moved to its absolute position.
 */
export function createCursorController(stream: NodeJS.WriteStream): CursorController {
  let target: CursorTarget | null = null;
  return {
    setTarget(next) {
      target = next;
    },
    place() {
      if (!target) {
        stream.write("\x1b[?25l");
        return;
      }
      const { x, y } = framePosition(target.node);
      stream.write(`\x1b[${y + 1};${x + target.column + 1}H\x1b[?25h`);
    },
  };
}

/** Set by the full-screen chat; an input without it draws its own block cursor. */
export const CursorContext = createContext<CursorController | null>(null);
