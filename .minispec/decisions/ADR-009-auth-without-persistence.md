# ADR-009: Claude sign-in through Claude Code's own flow, never a token

## Decision

Revised 28 October 2026 (#90). The kit never sees, returns or stores a Claude account's credentials. It runs the Claude Code binary the Agent SDK ships (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>`, unmodified; `claudeExecutable()`), and only two of its commands:

- `claude auth status --json` — `claudeSignedIn()` (core): true when the person's environment has `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` (their own setting), else the binary's `loggedIn`. The credentials file is never read.
- `claude auth login` — `ensureClaudeAuth()` (tui) runs it on the terminal (inherited stdio) after a confirm; `startClaudeSignIn()` (core) runs it over plain pipes for a host without a terminal, and gives the URL it prints (OSC 8 escapes removed), a way to pass the code Anthropic's page shows, and whether the person ended signed in. The binary opens the browser and keeps the credentials itself (`~/.claude/`, the Keychain on macOS), where the SDK's sessions find them.

API keys stay allowed: an agent may take one from the person and keep it.

## Motivation

Anthropic's terms (https://code.claude.com/docs/en/legal-and-compliance, "Authentication and credential use"): developers building on the Agent SDK may not collect, store or intermediate Claude.ai credentials or session tokens; sign-in to a Claude account completes through Anthropic's own flow; an end user may sign in to the unmodified Claude Code binary with their own subscription. The earlier design (`resolveClaudeAuth()` taking a stored token, `ensureClaudeAuth()` capturing the `sk-ant-oat…` token `claude setup-token` printed and returning it to be stored) broke this.

Confirmed empirically (binary 2.1.310): `auth status --json` prints `{ loggedIn, authMethod, … }` and exits 1 when signed out; `auth login` works without a TTY, prints the URL and waits at "Paste code here if prompted >"; `setup-token` needs a TTY and only prints a token for copying, so it's gone.

Earlier still, a `globalConfigStore.ts` read and wrote `~/.<appName>/config.json` from the kit, mixing each agent's config into generic code: the core stays free of persistence and of terminal prompts.

## Consequences

- An agent signs in once; the sign-in is shared with the person's own Claude Code on the same machine.
- No token to redact from the kit's side; the transcript logger still redacts a `CLAUDE_CODE_OAUTH_TOKEN` the environment brings.
- What the binary prints after a successful code isn't relied on: its exit and `auth status` decide.
- A packaged app needs the binary unpacked (ADR-026), as its sessions do.
