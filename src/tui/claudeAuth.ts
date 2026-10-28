import { spawn } from "node:child_process";
import { claudeCommand, claudeExecutable, claudeSignedIn } from "../core/claudeAuth.js";
import { isExitPromptError } from "./promptErrors.js";
import * as ui from "./ui.js";
import { runWizard } from "./ink/wizard.js";
import { applyLanguage } from "./language.js";
import { t } from "../core/messages/index.js";

/** Runs Claude Code's own `auth login` on this terminal: it opens the browser, and the person pastes the code here. */
function runLogin(executable: string): Promise<void> {
  const command = claudeCommand(executable, ["auth", "login"]);
  return new Promise((resolve) => {
    const child = spawn(command.file, command.args, { stdio: "inherit" });
    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });
}

/**
 * Makes sure the agent can reach Claude before a terminal chat starts: returns at once when
 * `claudeSignedIn()` says so (an API key or the person's own token in the environment, or a
 * Claude Code sign-in). Otherwise it says why, asks whether to sign in, and runs Claude Code's
 * own `claude auth login` (the binary the Agent SDK ships) on this terminal: Anthropic's page in
 * the browser, the code it shows pasted here. The binary keeps the credentials; nothing is
 * returned or stored (ADR-009: Anthropic's terms forbid an agent collecting them). Exits the
 * process when the person declines or the sign-in doesn't complete: there's no agent to run
 * without Claude.
 *
 * Only makes sense with a terminal in front of a person (a `runWizard()` confirm, colored
 * output); a host without one uses `startClaudeSignIn()` from the core.
 */
export async function ensureClaudeAuth(options: { language?: string } = {}): Promise<void> {
  if (await claudeSignedIn()) return;
  applyLanguage(options.language);
  const texts = t().auth;

  const executable = claudeExecutable();
  if (!executable) {
    console.log(ui.error(`\n${texts.noClaude}`));
    process.exit(1);
  }

  console.log(ui.warn(`\n${texts.notSignedIn}`));
  console.log(ui.dim(texts.notSignedInDetail));

  try {
    const { signIn } = await runWizard([{ type: "confirm", name: "signIn", message: texts.signInQuestion, default: true }]);
    if (!signIn) {
      console.log(ui.error(`\n${texts.cantStart}`));
      process.exit(0);
    }
  } catch (error) {
    if (isExitPromptError(error)) process.exit(0);
    throw error;
  }

  console.log(ui.heading(`\n${texts.signingInHeading}`));
  console.log(ui.dim(`${texts.browserWillOpen}\n`));
  await runLogin(executable);

  if (!(await claudeSignedIn())) {
    console.log(ui.error(`\n${texts.notCompleted}`));
    process.exit(1);
  }
  console.log(ui.success(`\n${texts.signedIn}\n`));
}
