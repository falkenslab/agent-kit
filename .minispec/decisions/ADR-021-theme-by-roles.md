# ADR-021: A color theme by roles

## Decision

The terminal UI's colors come from one theme of roles (`agent`, `user`, `userBar`, `accent`, `working`, `code`, `toolBullet`, `toolLabel`, `toolResult`, `selection`, `border`, `dim`, `heading`, `action`, `success`, `warn`, `error`) in `src/tui/theme.ts`. An agent overrides some of them with the `theme` option of `runChatInk()`, `runChatTui()`, `createProgressView()` or `runWizard()`, or with `setTheme()`; the roles it doesn't give keep the kit's defaults. A value is a color name, a hex or a function.

## Motivation

- The colors were spread over `ui.ts`, constants in the Ink views and `@inkjs/ui`'s own default theme, and an agent could change none of them; two requests from teacher-agent's user were colors (#1, #2).
- Roles, not colors: an agent says what it wants tool results to look like, not which call sites to patch. The `ui` functions read the theme, so an agent's own texts drawn with `ui.agent()` follow it too.
- Names and hexes cover most wishes and work both as text escape codes and as Ink props; a function covers the rest (bold, a background).
- One theme per process, like the language (ADR-019): an agent has one look.

## Consequences

- Roles drawn by Ink props (`accent` for the panels' border, `border`, `selection`) can't take a function; there it falls back to the default color.
- `@inkjs/ui`'s components get the theme through a `ThemeProvider` (`KitTheme`) around each Ink root: the focused option of every `Select` is in `selection`, bold.
- Defaults changed with it: tool labels and results are dimmed (errors stay red), and the focused option is the accent orange instead of the library's navy blue.
- Colors still disappear without color support, and widths are measured without escape codes, so a theme never changes the layout; the session log stays plain text.
