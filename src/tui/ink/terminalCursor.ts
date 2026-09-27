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
  /** The stream Ink must write to (see createCursorController()). */
  stream: NodeJS.WriteStream;
}

const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

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
 *
 * Ink's `useCursor` doesn't fit a frame as tall as the terminal: that redraw path moves the
 * cursor only when its position changes, and one row off. A full-screen frame always starts
 * at the top-left corner, so after Ink writes, the cursor is moved to its absolute position.
 * Ink writes through `stream`, which hides the cursor before every write: otherwise, between
 * a frame (which leaves the cursor at its end) and the move, the terminal draws the cursor
 * at the bottom too, and with the spinner redrawing ~12 times a second it shows in two
 * places at once (seen on Windows Terminal).
 */
export function createCursorController(output: NodeJS.WriteStream): CursorController {
  let target: CursorTarget | null = null;
  let scheduled = false;

  function place(): void {
    scheduled = false;
    if (!target) return; // stays hidden
    const { x, y } = framePosition(target.node);
    output.write(`\x1b[${y + 1};${x + target.column + 1}H${SHOW}`);
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    // After the rest of Ink's writes for this frame, which are synchronous.
    queueMicrotask(place);
  }

  const write = (chunk: string | Uint8Array, ...rest: unknown[]): boolean => {
    const ok = (output.write as (...args: unknown[]) => boolean)(typeof chunk === "string" ? HIDE + chunk : chunk, ...rest);
    schedule();
    return ok;
  };

  // Everything but write goes to the real stream (columns, rows, resize events, isTTY...).
  const stream = new Proxy(output, {
    get(real, property) {
      if (property === "write") return write;
      const value = Reflect.get(real, property, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });

  return {
    setTarget(next) {
      target = next;
      if (!next) output.write(HIDE);
      schedule();
    },
    stream,
  };
}

/** Set by the full-screen chat; an input without it draws its own block cursor. */
export const CursorContext = createContext<CursorController | null>(null);
