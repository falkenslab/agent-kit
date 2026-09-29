# A readable highlight for the selected option

Issue: [#1](https://github.com/falkenslab/agent-kit/issues/1)

## Goal

Show the focused option of every choice list (approval panels, `/resume`, the wizard) in a color that reads well on a dark terminal, instead of `@inkjs/ui`'s default dark blue.

## Context

- The kit's choice lists are `@inkjs/ui`'s `Select`, used without a theme: `SessionView.tsx` (the approval and manual-intervention panels: "1. Yes / 2. No / 3. Stop"), `runChatInk.tsx` (the `/resume` picker) and `wizard.tsx` (`runWizard()`'s choice steps).
- `@inkjs/ui`'s default theme paints the focused option and its `❯` in `blue`, the terminal's ANSI blue, which on most dark themes (Windows Terminal, VS Code) is a dark navy that barely stands out from the background. It's the one answer the human has to read before pressing Enter.
- The rest of the Ink views already have a palette (`ui.ts`): the orange `accent` (spinner, mode, panel border), `working` (a light blue), `code`.
- Reported by teacher-agent's user (2026-09-29).

## Changes

- Wrap the Ink trees that render a `Select` in `@inkjs/ui`'s `ThemeProvider` with `extendTheme(defaultTheme, …)`, so the `Select` component's focused indicator and label use the kit's palette: the orange `accent` (the panel border's color), bold. Not ANSI `blue`.
- Same theme for all three uses; if `ConfirmInput`/`TextInput` in the wizard have the same dark-blue parts, include them.
- Colors stay off when the terminal has none (`pc.isColorSupported`), as the rest of `ui.ts`.

## Acceptance

- In an approval panel, `/resume` and a wizard choice, the focused option is the orange accent and bold, legible on Windows Terminal's and VS Code's dark themes, and still distinct on a light theme.
- captain-whiskers shows it; a screenshot of an approval panel is kept.
- `verify` passes.
