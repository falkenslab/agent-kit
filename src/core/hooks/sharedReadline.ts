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

let activeQuestions = 0;

/**
 * Asks `question` on the shared interface, flagging it as in progress meanwhile — so the
 * REPL that owns the interface can tell a human-in-the-loop checkpoint waiting on the
 * keyboard apart from a turn simply streaming (e.g. Esc must not interrupt the turn while
 * an approval question is on screen).
 */
export async function askOnSharedReadline(rl: readline.Interface, question: string): Promise<string> {
  activeQuestions++;
  try {
    return await rl.question(question);
  } finally {
    activeQuestions--;
  }
}

export function isSharedQuestionActive(): boolean {
  return activeQuestions > 0;
}
