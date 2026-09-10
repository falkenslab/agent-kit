export interface ClaudeAuthConfig {
  /** A previously-resolved token the caller already has (from wherever it stores one, if
   * anywhere) — this module owns no persistence of its own, unlike an earlier version
   * that read/wrote `~/.<appName>/config.json` itself (see git history). Sourcing this
   * value across runs, if a concrete agent wants that at all, is entirely its own concern. */
  claudeCodeOAuthToken?: string;
}

/**
 * Pure lookup, no I/O and no console output of any kind — safe to call from a
 * headless/non-interactive consumer (a server, an Electron main process) as much as from a
 * terminal one.
 *
 * Checks, in order: `ANTHROPIC_API_KEY` (a complete authentication path on its own — API
 * billing instead of subscription, so nothing else is checked when it's set),
 * `CLAUDE_CODE_OAUTH_TOKEN`, then `config.claudeCodeOAuthToken` if the caller passed one.
 * Returns `true` and (for the `config` case) sets `CLAUDE_CODE_OAUTH_TOKEN` on the process
 * as a side effect once a token is found — the SDK's own subprocess reads that env var
 * directly, never anything this kit passes it explicitly; `false` when none of the three
 * has one. Getting a token in that case (e.g. by walking the user through
 * `claude setup-token`) is a terminal-UX concern, not this function's — see
 * `ensureClaudeAuth()` in tui/claudeAuth.ts, which calls this first and only falls back to
 * that interactive flow when it returns `false`.
 */
export function resolveClaudeAuth(config: ClaudeAuthConfig = {}): boolean {
  if (process.env.ANTHROPIC_API_KEY) return true;
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return true;

  if (config.claudeCodeOAuthToken) {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = config.claudeCodeOAuthToken;
    return true;
  }

  return false;
}
