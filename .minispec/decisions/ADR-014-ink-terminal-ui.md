# ADR-014: Ink as the terminal UI, with the readline one as fallback

## Decision

The kit ships an Ink (React) terminal UI in `src/tui/ink/`: `runChatInk()`, `createProgressView()` and `runWizard()`. Each falls back to the plain version (`runChatTui()`, `createConsoleRenderer()`, `@inquirer/prompts`) without a TTY or with `plain`. Ink 6 (not 7), to keep Node ≥ 20.

## Motivation

A redrawable UI shows what a console can't: the reply streaming in place, a spinner with the current action and a subagent's, approval panels, a status bar with turns and tokens (the cost in dollars is deliberately left out). Consumers get it for free instead of each building its own. The plain versions stay because piped and background runs (and consumers' tooling reading the session log) must behave exactly as before.

## Consequences

The session log still comes from `createConsoleRenderer()` (every event goes through it, output discarded, `onWrite` kept), so it reads exactly as the console prints it. The screen is built apart from it, from the events (`sessionModel.ts`), in the look of the Claude Code CLI: the agent's words behind `●` with their markdown rendered (`markdown.ts`), consecutive tool calls folded into one summary line that Ctrl+O unfolds (`toolGroup.ts`, with each call's result from the `tool-result` event), a summary when a turn ends. So the screen text no longer equals the log text. While mounted they install an Ink `InteractionPort` (ADR-013), so no second stdin reader competes with Ink. Checkpoint texts go to the history but not to the session log, as before. `react`, `ink`, `@inkjs/ui` and `@types/react` (its types are in the public `.d.ts`) are dependencies. Tests for `.tsx` declare `@jsxRuntime automatic`, since `tsx` applies `tsconfig.json` only to `src/`.

Opt-in: `runChatTui()` keeps its readline UI and each consumer switches to `runChatInk()` itself, so no consumer's UI changes on a kit upgrade. Ctrl+C on an open panel answers it with "q" (stop) and interrupts the turn, so no checkpoint is left pending behind the interruption. `initialPrompt` stays off screen (logged only) and checkpoints stay out of the session log, as in `runChatTui()`.

Terminal size: nothing Ink redraws may reach the terminal's last column (`liveWidth()`: columns − 4, read on every render, so a resize is picked up), or the live area leaves a stale copy of itself on every redraw; the line in progress is cut into rows that move to `<Static>`, and labels are cut with "…". Nor may the redrawn part be taller than the terminal, or Ink clears the whole screen: approval previews, command suggestions and a select's visible choices are capped by the rows available, and a wizard's answered steps go to `<Static>`.
