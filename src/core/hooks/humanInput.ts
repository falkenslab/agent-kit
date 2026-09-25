import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { askOnSharedReadline, getSharedReadline } from "./sharedReadline.js";

export interface ApprovalPrompt {
  title: string;
  lines: string[];
  /** Terminal question text; defaults to the approve/reject one. */
  question?: string;
}

/**
 * Asks the human for a decision through two channels in parallel, whichever answers
 * first wins: (1) keyboard, for when a person is running the process in their own
 * terminal, and (2) a response file, for when something else (e.g. Claude Code, or a
 * non-terminal host driving its own UI — an Electron main process, a Tauri sidecar) is
 * piloting the run and has no interactive stdin to write to.
 *
 * Whether the keyboard channel (and any console output at all) is even attempted is
 * decided once, from `stdin.isTTY` — confirmed empirically that a non-TTY `rl.question()`
 * still writes its query text to `stdout` even though it can never resolve from real
 * keystrokes, so skipping the whole readline.Interface (not just not reading from it) is
 * what actually keeps a non-interactive host's stdout silent. A non-interactive host
 * depends entirely on the response file and its own UI to ask the question — nothing
 * here prints anything for it to accidentally surface.
 *
 * Returns the answer lowercased and trimmed ("", "y", "n", "q"...).
 */
export async function askForDecision(runDir: string, prompt: ApprovalPrompt): Promise<string> {
  const interactive = Boolean(stdin.isTTY);

  if (interactive) {
    console.log(`\n=== ${prompt.title} ===`);
    for (const line of prompt.lines) console.log(line);
  }

  const responseFile = path.join(runDir, "approval-response.txt");
  await rm(responseFile, { force: true });

  let settled = false;
  // Reuses a chat REPL's readline.Interface if one exists (see sharedReadline.ts):
  // creating (and closing) our own here while that other one is still open leaves the
  // terminal stuck afterward, by stepping on the shared stdin's raw mode.
  const sharedRl = interactive ? getSharedReadline() : null;
  const rl = interactive ? (sharedRl ?? readline.createInterface({ input: stdin, output: stdout })) : null;

  const fromKeyboard = (async (): Promise<string> => {
    if (!rl) return await new Promise<string>(() => {}); // non-interactive: let the file channel win
    try {
      const question = prompt.question ?? "Allow this to continue? [Y/n/q] ";
      return await (sharedRl ? askOnSharedReadline(sharedRl, question) : rl.question(question));
    } catch {
      // Non-interactive stdin (e.g. process piloted in the background): don't race,
      // let the response file win.
      return await new Promise<string>(() => {});
    }
  })();

  const fromFile = (async (): Promise<string> => {
    while (!settled) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const content = (await readFile(responseFile, "utf-8")).trim();
        if (content) return content;
      } catch {
        // the file doesn't exist yet, keep waiting
      }
    }
    return "";
  })();

  const raw = await Promise.race([fromKeyboard, fromFile]);
  settled = true;
  if (rl && !sharedRl) rl.close();
  await rm(responseFile, { force: true });

  return raw.trim().toLowerCase();
}
