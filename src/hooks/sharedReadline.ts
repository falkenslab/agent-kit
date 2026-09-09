import type readline from "node:readline/promises";

/**
 * A long-lived chat REPL's readline interface (if any), so that humanInput.ts's
 * askForDecision() reuses it instead of creating its own.
 *
 * Closing a readline.Interface desyncs stdin's raw mode for *any* other interface still
 * alive on the same stream — Interface.close() calls input.setRawMode(false) directly on
 * the shared stream, not something private to that instance (confirmed by reading
 * node:readline/promises). If askForDecision() creates and closes its own interface while
 * a chat REPL's own is still open waiting at its prompt, that second interface stops
 * receiving keystroke events — the prompt sits there accepting no input. By registering
 * the REPL's interface here, askForDecision() reuses it (creating or closing nothing)
 * whenever it's available.
 */
let current: readline.Interface | null = null;

export function setSharedReadline(rl: readline.Interface | null): void {
  current = rl;
}

export function getSharedReadline(): readline.Interface | null {
  return current;
}
