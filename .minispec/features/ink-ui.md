# Terminal UI with Ink

## Goal

Replace the readline chat and the inquirer wizards with an Ink (React) terminal UI that every consumer gets, keeping a plain-text fallback for hosts without a TTY.

## Context

- The chat (`runChatTui()`), the event printer (`createConsoleRenderer()`), auth prompts and the palette are in `src/tui/`; consumers only add labels, welcome text and their own wizards (`menu.ts` in teacher-agent and student-agent, both on `@inquirer/prompts`).
- `askForDecision()` (`core/hooks/humanInput.ts`) prints with `console.log` and reads readline when stdin is a TTY: the one place in `core/` tied to the terminal (ADR-001), and the reason `sharedReadline.ts` exists (ADR-004). Ink and a second stdin reader would fight the same way.
- `runQuery()`'s `AgentEvent` stream is already the seam a React UI needs.
- Consumers' tooling depends on the response file and on the session log text (teacher-agent's `auto-approve.mjs` waits for "Sesión cerrada").

## Changes

- Phase 0 — interaction port (no visible change):
  - `InteractionPort` in `core/`: `askDecision(prompt)`, `askManualIntervention(prompt)`, `notify(message)`.
  - `askForDecision()` delegates the keyboard side to the port; the response file keeps racing it unchanged.
  - Current readline behavior becomes the default port in `tui/`; `sharedReadline.ts` folds into it.
- Phase 1 — Ink chat (`src/tui/ink/`, deps `ink`, `react`, `@inkjs/ui`):
  - `runChatInk(options, tuiOptions)`: header slot (consumer's title and fields), history in `<Static>`, live area with streamed reply, current tool with spinner and subagent activity.
  - Input with ↑/↓ history (same `historyPath` file), `/command` completion from the loaded plugins, Esc to interrupt.
  - Approval and manual-intervention panels through the port: preview plus a Select (approve / reject / quit), with a `renderApproval` slot for consumers.
  - Status bar: mode, turns, tokens, cost.
  - Session log mirrored exactly as today; `drainTurn()` reused (ADR-010).
  - Falls back to `runChatTui()` without a TTY or with a `plain` option.
- Phase 2 — wizards: `runWizard(steps)` on Ink (select, input, password, confirm), so consumers' `menu.ts` become step definitions; `ensureClaudeAuth()` moves onto it.
- Phase 3 — one-shot progress view: an Ink counterpart of `createConsoleRenderer()` for `run`-style sessions.
- Update `captain-whiskers`, `architecture.md`, an ADR for the port, README; then consumers adopt it (their own features).

## Acceptance

- Phase 0: all tests pass, and a guided session answers approvals from the keyboard and from the response file exactly as before.
- `ink-testing-library` tests for the chat, approval panel and wizard; existing `chatTui`/`consoleRenderer` tests still pass.
- captain-whiskers and a teacher-agent chat (via `try-agent-kit-local`) work in Windows Terminal: streaming, Esc, approvals, history.
- Without a TTY (piped, background, teacher-agent's `simulate-course`) the session behaves and logs exactly as today.
- `check-consumers` passes for teacher-agent and student-agent.
