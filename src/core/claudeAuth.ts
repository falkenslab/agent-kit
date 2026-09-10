import { createGlobalConfigStore, type BaseGlobalConfig } from "./globalConfigStore.js";

/**
 * Builds a `resolveClaudeAuth()` bound to `~/.<appName>/config.json` (via
 * globalConfigStore.ts). Purely a lookup, no I/O beyond reading that file and no console
 * output of any kind — safe to call from a headless/non-interactive consumer (a server, an
 * Electron main process) as much as from a terminal one.
 *
 * Checks, in order: `ANTHROPIC_API_KEY` (a complete authentication path on its own — API
 * billing instead of subscription, so nothing else is checked when it's set),
 * `CLAUDE_CODE_OAUTH_TOKEN`, then the app's own global config file. Returns `true` and
 * (for the config-file case) sets `CLAUDE_CODE_OAUTH_TOKEN` on the process as a side effect
 * once a token is found; `false` when none of the three has one. Getting a token in that
 * case (e.g. by walking the user through `claude setup-token`) is a terminal-UX concern,
 * not this function's — see `createClaudeAuthTui()` in tui/claudeAuth.ts, which calls this
 * first and only falls back to that interactive flow when it returns `false`.
 */
export function createClaudeAuth(appName: string): { resolveClaudeAuth: () => Promise<boolean> } {
  const store = createGlobalConfigStore<BaseGlobalConfig>(appName);

  async function resolveClaudeAuth(): Promise<boolean> {
    if (process.env.ANTHROPIC_API_KEY) return true;
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return true;

    const globalConfig = await store.read();
    if (globalConfig.claudeCodeOAuthToken) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = globalConfig.claudeCodeOAuthToken;
      return true;
    }

    return false;
  }

  return { resolveClaudeAuth };
}
