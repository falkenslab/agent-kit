# A color theme agents can change
Issue: [#4](https://github.com/falkenslab/agent-kit/issues/4)

## Goal

Give the terminal UI one default color theme, by roles, that an agent overrides in part with a single option.

## Context

- The palette is spread out: most of it in `src/tui/ui.ts` (picocolors functions and 24-bit `rgb()` colors), the panel's orange repeated as `ACCENT_HEX` in `SessionView.tsx`, borders hard-coded as `"gray"` in `SessionView.tsx` and `runChatInk.tsx`, and `@inkjs/ui`'s `Select` in its own default blue. An agent can change none of it, except its own tool labels through `formatAction`.
- Two requests from teacher-agent's user (2026-09-29), both about colors:
  - #1: the focused option of choice lists (approval panels, `/resume`, the wizard) is a navy blue that barely shows on dark terminals.
  - #2: the one-line tool result under each call (`⎿ …`, `resultSummary()` in `toolGroup.ts`) is as bright as the agent's replies; "white only for the agent and me".

## Changes

- A `Theme` of roles: `agent`, `user`, `userBar`, `accent`, `working`, `toolLabel`, `toolResult`, `toolBullet`, `selection`, `border`, `code`, `dim`, `success`, `warn`, `error` (adjust while implementing). Each value is a color name (`"gray"`, `"cyanBright"`), a hex (`"#ff8800"`) or a function `(text) => string`.
- Defaults are today's look, plus: `toolResult` and `toolLabel` dimmed (#2; errors stay red), `selection` in the accent orange and bold (#1).
- A `theme?: Partial<Theme>` option on `runChatInk()`, `runChatTui()`, `createProgressView()` and `runWizard()`: only the roles given change. One theme per process, like the language (ADR-019).
- `ui.ts` reads the current theme; Ink components take their border, accent and `Select` colors from it (a `Select` theme for `selection`); no color stays hard-coded outside it.
- Colors keep falling back to plain text when the terminal has no color, and widths are still measured without escape codes (`fitWidth`).
- Exported: `Theme`, `DEFAULT_THEME`, and `setTheme()` for a host that sets it once.
- captain-whiskers changes a couple of roles, as the example.
- README: one line and a short example; an ADR for the theme by roles.

## Acceptance

- By default in captain-whiskers' chat (full screen and `CAPTAIN_INLINE=1`): tool labels and results gray, errors red, the agent's replies and the human's messages in their colors, the focused option readable (orange, bold) in the approval panel, `/resume` and the wizard.
- An agent passing `theme: { toolResult: "yellow", selection: "#00ff00" }` gets those two and the defaults for everything else (test).
- A function value is applied as given; a hex or name works in both picocolors text and Ink props (test).
- Nothing is cut or misaligned at 80 and 130 columns; `session.log` stays plain text.
- `verify` passes.
