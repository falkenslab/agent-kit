# Sign in to Claude through Anthropic's own flow

Issue: [#90](https://github.com/falkenslab/agent-kit/issues/90)

## Goal

An agent built on the kit signs in to a Claude account only through the Claude Code binary's own `auth login`, and the kit never sees, returns or stores a token.

## Context

- Anthropic's terms (https://code.claude.com/docs/en/legal-and-compliance, "Authentication and credential use"): Agent SDK developers may not collect, store or intermediate Claude.ai credentials; sign-in completes through Anthropic's flow, in the unmodified Claude Code binary; API keys are allowed.
- Today `ensureClaudeAuth()` captures the token `claude setup-token` prints and returns it to be stored; `resolveClaudeAuth()` sets a stored one as `CLAUDE_CODE_OAUTH_TOKEN`. Captain Whiskers stores it and its page asks to paste one.
- The SDK ships the binary (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>`): `auth status --json` says `loggedIn`; `auth login` works over plain pipes (prints a URL, waits for a code), and the binary keeps the credentials.

## Changes

- Core: `claudeExecutable()`, `claudeSignedIn()`, `startClaudeSignIn()`; remove `resolveClaudeAuth` and `ClaudeAuthConfig`.
- TUI: `ensureClaudeAuth()` runs `auth login` with the terminal inherited; returns nothing.
- `auth` messages in the four languages.
- Captain Whiskers: no stored OAuth token; the page signs in with the Claude account or takes an API key.
- Tests against a fake binary; docs (EN/ES), ADR-009, architecture.

## Acceptance

- No code path in the kit or the captain reads, returns or stores an OAuth token.
- `claudeSignedIn()` and `startClaudeSignIn()` pass against a fake binary (status, URL with OSC 8, code on stdin, cancel).
- The captain typechecks; the docs build; nothing mentions `setup-token` or `resolveClaudeAuth`.
