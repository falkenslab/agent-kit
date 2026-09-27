# ADR-009: Auth resolution without persistence

## Decision

`resolveClaudeAuth()` (core) only checks `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` and a token the caller passes, with no I/O. `ensureClaudeAuth()` (tui) offers `claude setup-token` and returns the new token; the kit never stores it.

## Motivation

An earlier `globalConfigStore.ts` read and wrote `~/.<appName>/config.json` from the kit, mixing each agent's own config into generic code. Non-interactive consumers need the lookup without `@inquirer/prompts` or `process.exit`.

## Consequences

Each consumer decides where (and whether) to persist the token. The kit still owns the token concept: the transcript logger always redacts `CLAUDE_CODE_OAUTH_TOKEN`.
