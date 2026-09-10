import { spawn } from "node:child_process";
import { confirm } from "@inquirer/prompts";
import { resolveClaudeAuth, type ClaudeAuthConfig } from "../core/claudeAuth.js";
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
 * The terminal-facing counterpart to `resolveClaudeAuth()` (core/claudeAuth.ts), which only
 * *looks up* a token. This one also gets you one: if `resolveClaudeAuth(config)` comes back
 * empty, it prints why, offers to run "claude setup-token" interactively, and sets the
 * result on `process.env.CLAUDE_CODE_OAUTH_TOKEN` for this run. Exits the process if the
 * user declines or cancels — there's no agent to run without a token.
 *
 * Persisting a freshly-generated token across runs is *not* this function's job — unlike an
 * earlier version, this kit owns no config-file storage of its own (see git history). When
 * the interactive flow does generate one, it's returned so the caller can save it wherever
 * it wants (a file, an OS keychain, ...) and pass it back in as `config.claudeCodeOAuthToken`
 * next time; returns `undefined` when auth was already resolved (an env var, or the `config`
 * passed in) and nothing new was generated.
 *
 * Only makes sense with a real terminal in front of a human (confirm prompt, colored console
 * output), which is why it lives here rather than in the non-interactive core.
 */
export async function ensureClaudeAuth(config: ClaudeAuthConfig = {}): Promise<string | undefined> {
  if (resolveClaudeAuth(config)) return undefined;

  console.log(ui.warn("\nNo Claude authentication token was found"));
  console.log(ui.dim("(neither the CLAUDE_CODE_OAUTH_TOKEN environment variable, nor one passed in)."));

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
  console.log(ui.success("\nToken generated for this run. Save it yourself (e.g. CLAUDE_CODE_OAUTH_TOKEN in your shell profile) to skip this next time.\n"));

  return token;
}
