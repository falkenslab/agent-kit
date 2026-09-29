import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ApprovalPrompt, InteractionPort } from "../core/interaction.js";
import { t } from "../core/messages/index.js";


/**
 * A long-lived chat REPL's readline interface (if any), so that the terminal port reuses
 * it instead of creating its own.
 *
 * Closing a readline.Interface desyncs stdin's raw mode for *any* other interface still
 * alive on the same stream — Interface.close() calls input.setRawMode(false) directly on
 * the shared stream, not something private to that instance (confirmed by reading
 * node:readline/promises). If the port creates and closes its own interface while a chat
 * REPL's own is still open waiting at its prompt, that second interface stops receiving
 * keystroke events — the prompt sits there accepting no input. By registering the REPL's
 * interface here, the port reuses it (creating or closing nothing) whenever it's available.
 */
let sharedReadline: readline.Interface | null = null;

export function setSharedReadline(rl: readline.Interface | null): void {
  sharedReadline = rl;
}

export function getSharedReadline(): readline.Interface | null {
  return sharedReadline;
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

function never(): Promise<string> {
  return new Promise<string>(() => {});
}

/**
 * Whether the keyboard channel (and any console output at all) is even attempted is
 * decided from `stdin.isTTY` — confirmed empirically that a non-TTY `rl.question()` still
 * writes its query text to `stdout` even though it can never resolve from real keystrokes,
 * so skipping the whole readline.Interface (not just not reading from it) is what actually
 * keeps a non-interactive host's stdout silent: it depends entirely on the response file.
 */
async function askOnTerminal(prompt: ApprovalPrompt, signal: AbortSignal): Promise<string> {
  if (!stdin.isTTY) return await never();

  console.log(`\n=== ${prompt.title} ===`);
  for (const line of prompt.lines) console.log(line);
  const question = prompt.question ?? t().terminalQuestion;

  const shared = sharedReadline;
  if (shared) return await askOnSharedReadline(shared, question);

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const close = (): void => rl.close();
  signal.addEventListener("abort", close, { once: true });
  try {
    return await rl.question(question);
  } finally {
    signal.removeEventListener("abort", close);
    rl.close();
  }
}

/**
 * The default `InteractionPort`, installed by the package entry point: prints the
 * checkpoint and reads the answer on the terminal, on the chat's own readline when one is
 * registered via `setSharedReadline()`. Without a TTY it prints nothing and never answers.
 */
export const terminalInteractionPort: InteractionPort = {
  askDecision: askOnTerminal,
  askManualIntervention: askOnTerminal,
  notify(message: string): void {
    if (stdin.isTTY) console.log(message);
  },
};
