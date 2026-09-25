---
name: add-export
description: Checklist for adding or changing anything in agent-kit's public API or for placing new code in src/core vs src/tui - where it goes, how to export it, what to test and which docs to update. Use when adding a function, option or type that consumers will use.
---

# Adding to agent-kit's public API

## 1. Decide where the code lives

`src/` is split along one question: **does this code assume a terminal?**
- `src/core/`: no `console.*`, `process.stdout`, `readline`, colors or prompts. Must be usable from Electron's main process, a server or a sidecar. This is where `AgentSpec`, `buildSessionOptions()`, hooks, tools, auth resolution, transcript logging and `runQuery()` live.
- `src/tui/`: terminal-only (`readline`, `picocolors`, `@inquirer/prompts`): `runChatTui()`, `ensureClaudeAuth()`, `ui`.
- `core/` must never import from `tui/`. Only `src/index.ts` may import from both.
- If a core function needs to print or prompt, that is a sign it belongs in `tui/`, or the terminal behavior must be gated (see `askForDecision()`, silent when stdin is not a TTY).
- Keep the kit domain-agnostic: no course, credential or other concrete-agent concepts. Domain data goes in the consumer's own config type extending `BaseSessionConfig`; things a consumer needs to decide go through an `AgentSpec` method or an option.

## 2. Implement

- Relative imports inside `src/` use explicit `.js` extensions (NodeNext).
- Add a doc comment that explains *why*, especially for SDK quirks. Only write "confirmed empirically" when you actually confirmed the behavior (against `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` or by running it).
- Prefer optional parameters/options with the previous behavior as the default, so existing consumers do not break.

## 3. Export

Add the symbol to `src/index.ts` (the single source of truth for the public API). Consumers must never need deep imports. Helpers exported from a module only so tests can reach them (like `drainTurn`, `capHistory`) are deliberately **not** re-exported from `index.ts`.

## 4. Test

Add or extend a test under `test/` mirroring the `src/` path (`test/core/...`, `test/tui/...`) using `node:test` + `node:assert/strict`. Prefer testing pure helpers directly; for terminal or SDK behavior that cannot be exercised here, say so explicitly rather than claiming it works.

## 5. Docs

- `README.md` (Spanish, user-facing): mention the new option/function where its area is described.
- `CLAUDE.md` (English, for future Claude sessions): update the relevant architecture section if the design or a rule changed.
- Update stale statements you notice while there (paths, lists of event types, mode values).

## 6. Finish

Run the `verify` skill, then `check-consumers`. If the change breaks existing consumers, mark the commit as breaking (`!`) and see the `commit` and `release` skills.
