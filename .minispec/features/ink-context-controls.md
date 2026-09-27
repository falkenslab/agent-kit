# Context and controls in the Ink chat

## Goal

Give the Ink chat Claude Code's context controls: `@` file mentions, the context in use, a shortcuts panel, and switching the supervision mode with Shift+Tab.

## Context

- The SDK's `Query.getContextUsage()` reports the tokens in context and their percentage; it has no public file-suggestion method, so file mentions list files themselves.
- Mode (`interactive` / `guided` / `autonomous`) is fixed when the session is built (`session.ts`): the step gate hook exists only in `interactive`, the approval tool only outside `autonomous` (its absence is the point of `autonomous`), and the consumer's system prompt may depend on it.

## Changes

- `@` mentions: typing `@` offers files under the session's `cwd` (skipping `node_modules`, `.git`, dot folders), filtered as you type, Tab to complete, as a path in the prompt.
- Context in use: after each turn, `getContextUsage()`'s percentage in the status bar.
- `?` on an empty prompt opens a panel with the shortcuts; any key closes it.
- Shift+Tab: core change. `buildSessionOptions()` returns a mode switch for the modes that share the same tools: the step gate hook is registered whenever the approval tool is and checks the current mode, so `guided` ↔ `interactive` can switch live. `autonomous` can't be entered or left live (the approval tool can't appear or vanish mid-session): Shift+Tab says so. New ADR.
- The status bar shows the mode with a `shift+tab to switch` hint when switching is possible.

## Acceptance

- In captain-whiskers: `@` lists and completes files; the status bar shows the context percentage; `?` shows the shortcuts; started with `CAPTAIN_MODE=guided`, Shift+Tab switches to `interactive` and the step gate starts asking, and back.
- The mode switch is covered by core tests (hook asks only in `interactive`); ADR written; `check-consumers` still passes.
- typecheck, lint, tests and captain-whiskers pass.
