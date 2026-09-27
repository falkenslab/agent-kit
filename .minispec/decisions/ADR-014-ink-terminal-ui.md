# ADR-014: Ink as the terminal UI, with the readline one as fallback

## Decision

The kit ships an Ink (React) terminal UI in `src/tui/ink/`: `runChatInk()`, `createProgressView()` and `runWizard()`. Each falls back to the plain version (`runChatTui()`, `createConsoleRenderer()`, `@inquirer/prompts`) without a TTY or with `plain`. Ink 6 (not 7), to keep Node ≥ 20.

## Motivation

A redrawable UI shows what a console can't: the reply streaming in place, a spinner with the current action and a subagent's, approval panels, a status bar with tokens and cost. Consumers get it for free instead of each building its own. The plain versions stay because piped and background runs (and consumers' tooling reading the session log) must behave exactly as before.

## Consequences

The Ink views render every event through `createConsoleRenderer()` (`sessionModel.ts`), so the history and the session log carry the same text as the console. While mounted they install an Ink `InteractionPort` (ADR-013), so no second stdin reader competes with Ink. Checkpoint texts go to the history but not to the session log, as before. `react`, `ink`, `@inkjs/ui` and `@types/react` (its types are in the public `.d.ts`) are dependencies. Tests for `.tsx` declare `@jsxRuntime automatic`, since `tsx` applies `tsconfig.json` only to `src/`.

Opt-in: `runChatTui()` keeps its readline UI and each consumer switches to `runChatInk()` itself, so no consumer's UI changes on a kit upgrade. Ctrl+C on an open panel answers it with "q" (stop) and interrupts the turn, so no checkpoint is left pending behind the interruption. `initialPrompt` stays off screen (logged only) and checkpoints stay out of the session log, as in `runChatTui()`.
