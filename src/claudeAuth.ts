import { spawn } from "node:child_process";
import { confirm } from "@inquirer/prompts";
import { isExitPromptError } from "./promptErrors.js";
import { createGlobalConfigStore, type BaseGlobalConfig } from "./globalConfigStore.js";
import * as ui from "./tui/ui.js";

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
 * Builds an `ensureClaudeAuth()` bound to `~/.<appName>/config.json` (via
 * globalConfigStore.ts) — the generalized version of moodle-agent's own
 * cli/claudeAuth.ts, which hardcoded "moodle-agent" as the app name.
 *
 * Makes sure a Claude authentication token is available before starting the agent. If
 * ANTHROPIC_API_KEY is already set, that's a complete authentication path on its own (API
 * billing instead of subscription): no token is needed and nothing is asked (the host
 * agent is expected to warn about this priority order itself, since only it knows whether
 * that's the intent). Otherwise, checks in order CLAUDE_CODE_OAUTH_TOKEN (environment
 * variable) and the global config file; if it's in neither place, offers to generate one
 * with "claude setup-token" and saves it for next time, or exits the process if the user
 * doesn't want to generate it now.
 */
export function createClaudeAuth(appName: string): { ensureClaudeAuth: () => Promise<void> } {
  const store = createGlobalConfigStore<BaseGlobalConfig>(appName);

  async function ensureClaudeAuth(): Promise<void> {
    if (process.env.ANTHROPIC_API_KEY) return;
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return;

    const globalConfig = await store.read();
    if (globalConfig.claudeCodeOAuthToken) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = globalConfig.claudeCodeOAuthToken;
      return;
    }

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
    await store.write({ ...globalConfig, claudeCodeOAuthToken: token });
    console.log(ui.success(`\nToken saved to ${store.path()} for future runs.\n`));
  }

  return { ensureClaudeAuth };
}
