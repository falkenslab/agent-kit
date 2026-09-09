import { spawn } from "node:child_process";
import { confirm } from "@inquirer/prompts";
import { createClaudeAuth } from "../claudeAuth.js";
import { createGlobalConfigStore, type BaseGlobalConfig } from "../globalConfigStore.js";
import { isExitPromptError } from "./promptErrors.js";
import * as ui from "./ui.js";

// The real format of "claude setup-token" tokens ("sk-ant-oat01-...", seen in the
// installed @anthropic-ai/claude-code binary) — used to extract the token from its output.
const TOKEN_PATTERN = /sk-ant-oat\d{2}-[A-Za-z0-9_-]+/;

/**
 * Launches "claude setup-token" as an interactive child process: it opens a browser and
 * asks the user to authenticate, with instructions it prints itself. stdin/stderr are
 * inherited as-is so the interaction (pasting the authorization code, etc.) is identical
 * to running the command by hand; stdout is duplicated live and also buffered to extract
 * the token it prints at the end ("Your OAuth token (...): sk-ant-oat01-...").
 */
function runSetupToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["@anthropic-ai/claude-code", "setup-token"], {
      stdio: ["inherit", "pipe", "inherit"],
      shell: process.platform === "win32",
    });

    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      output += text;
      process.stdout.write(text);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`"claude setup-token" exited with code ${code}.`));
        return;
      }
      const match = output.match(TOKEN_PATTERN);
      if (!match) {
        reject(new Error(
          '"claude setup-token" exited without errors, but no token was found in its ' +
            "output (sk-ant-oat...). Copy it by hand into CLAUDE_CODE_OAUTH_TOKEN if you see it above.",
        ));
        return;
      }
      resolve(match[0]);
    });
  });
}

/**
 * Builds an `ensureClaudeAuth()` bound to `~/.<appName>/config.json` — the terminal-facing
 * counterpart to `createClaudeAuth()` (claudeAuth.ts), which only *looks up* a token. This
 * one also gets you one: if `resolveClaudeAuth()` comes back empty, it prints why, offers
 * to run "claude setup-token" interactively, and persists the result for next time. Exits
 * the process if the user declines or cancels — there's no agent to run without a token.
 * Only makes sense with a real terminal in front of a human (confirm prompt, colored
 * console output), which is why it lives here rather than in the non-interactive core.
 */
export function createClaudeAuthTui(appName: string): { ensureClaudeAuth: () => Promise<void> } {
  const { resolveClaudeAuth } = createClaudeAuth(appName);
  const store = createGlobalConfigStore<BaseGlobalConfig>(appName);

  async function ensureClaudeAuth(): Promise<void> {
    if (await resolveClaudeAuth()) return;

    console.log(ui.warn("\nNo Claude authentication token was found"));
    console.log(ui.dim(
      `(neither the CLAUDE_CODE_OAUTH_TOKEN environment variable, nor ${store.path()}).`,
    ));

    try {
      const generate = await confirm({
        message: 'Generate one now with "claude setup-token" (requires a Claude Pro/Max subscription)?',
        default: true,
      });

      if (!generate) {
        console.log(ui.error(
          "\nThe agent can't start without a token. Set CLAUDE_CODE_OAUTH_TOKEN by hand " +
            "(or run this again and accept generating it) and try again.",
        ));
        process.exit(0);
      }
    } catch (error) {
      if (isExitPromptError(error)) process.exit(0);
      throw error;
    }

    console.log(ui.heading("\n=== Generating a Claude authentication token ==="));
    console.log(ui.dim(
      "A browser will open to log in; follow the instructions the command itself prints " +
        "below.\n",
    ));

    const token = await runSetupToken();
    process.env.CLAUDE_CODE_OAUTH_TOKEN = token;
    const globalConfig = await store.read();
    await store.write({ ...globalConfig, claudeCodeOAuthToken: token });
    console.log(ui.success(`\nToken saved to ${store.path()} for future runs.\n`));
  }

  return { ensureClaudeAuth };
}
