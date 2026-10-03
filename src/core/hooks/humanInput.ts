import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { getInteractionPort, type ApprovalPrompt, type InteractionPort } from "../interaction.js";

export type { ApprovalPrompt } from "../interaction.js";

/**
 * Asks the human for a decision through two channels in parallel, whichever answers
 * first wins: (1) the installed `InteractionPort` (the keyboard, for a person running the
 * process in their own terminal, see tui/terminalInteraction.ts), and (2) a response file,
 * for when something else (e.g. Claude Code, or a non-terminal host driving its own UI —
 * an Electron main process, a Tauri sidecar) is piloting the run and has no interactive
 * stdin to write to.
 *
 * Returns the answer lowercased and trimmed ("", "y", "n", "q"...).
 */
export async function askForDecision(runDir: string, prompt: ApprovalPrompt): Promise<string> {
  return await raceWithResponseFile(runDir, (port, signal) => port.askDecision(prompt, signal));
}

/**
 * A free-text answer, through the port's `askText()` (or `askDecision()` when it has none)
 * and the response file: trimmed, with its case kept.
 */
export async function askForText(runDir: string, prompt: ApprovalPrompt): Promise<string> {
  return await raceWithResponseFile(runDir, (port, signal) => (port.askText ? port.askText(prompt, signal) : port.askDecision(prompt, signal)), false);
}

/** Like `askForDecision()`, for a manual-intervention checkpoint (see tools/manualLogin.ts). */
export async function askForManualIntervention(runDir: string, prompt: ApprovalPrompt): Promise<string> {
  return await raceWithResponseFile(runDir, (port, signal) => port.askManualIntervention(prompt, signal));
}

function never(): Promise<string> {
  return new Promise<string>(() => {});
}

async function raceWithResponseFile(
  runDir: string,
  ask: (port: InteractionPort, signal: AbortSignal) => Promise<string>,
  lowercase = true,
): Promise<string> {
  const responseFile = path.join(runDir, "approval-response.txt");
  await rm(responseFile, { force: true });

  let settled = false;
  const controller = new AbortController();
  const port = getInteractionPort();
  // A port that fails to ask (e.g. a non-interactive stdin) must not win the race: let
  // the response file answer instead.
  const fromPort = port ? ask(port, controller.signal).catch(never) : never();

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

  const raw = await Promise.race([fromPort, fromFile]);
  settled = true;
  controller.abort();
  await rm(responseFile, { force: true });

  return lowercase ? raw.trim().toLowerCase() : raw.trim();
}
