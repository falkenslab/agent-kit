import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { getSharedReadline } from "./sharedReadline.js";

export interface ApprovalPrompt {
  title: string;
  lines: string[];
  /** Terminal question text; defaults to the approve/reject one. */
  question?: string;
}

/**
 * Asks the human for a decision through two channels in parallel, whichever answers
 * first wins: (1) keyboard, for when a person is running the process in their own
 * terminal, and (2) a response file, for when something else (e.g. Claude Code) is
 * piloting the run in the background and has no interactive stdin to write to. Returns
 * the answer lowercased and trimmed ("", "y", "n", "q"...).
 */
export async function askForDecision(runDir: string, prompt: ApprovalPrompt): Promise<string> {
  console.log(`\n=== ${prompt.title} ===`);
  for (const line of prompt.lines) console.log(line);

  const responseFile = path.join(runDir, "approval-response.txt");
  await rm(responseFile, { force: true });
  // The file channel is always live (needed for when another process is piloting the
  // session in the background with no interactive stdin — see the function's comment
  // above), but it's only mentioned on screen when it's actually needed: with an
  // interactive terminal in front of the human, mentioning it is noise nobody will use.
  console.log(
    stdin.isTTY
      ? 'Answer "y"/"n" (or "q" to stop):'
      : `Answer "y"/"n" (or "q" to stop) in this terminal, or write that letter to the ` +
          `file:\n  ${responseFile}`,
  );

  let settled = false;
  // Reuses a chat REPL's readline.Interface if one exists (see sharedReadline.ts):
  // creating (and closing) our own here while that other one is still open leaves the
  // terminal stuck afterward, by stepping on the shared stdin's raw mode.
  const sharedRl = getSharedReadline();
  const rl = sharedRl ?? readline.createInterface({ input: stdin, output: stdout });

  const fromKeyboard = (async (): Promise<string> => {
    try {
      return await rl.question(prompt.question ?? "Allow this to continue? [Y/n/q] ");
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
  if (!sharedRl) rl.close();
  await rm(responseFile, { force: true });

  return raw.trim().toLowerCase();
}
