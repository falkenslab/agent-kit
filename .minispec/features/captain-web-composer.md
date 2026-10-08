# Captain Whiskers' web: the prompt bar

Issue: [#45](https://github.com/falkenslab/agent-kit/issues/45)

## Goal

The prompt bar of Captain Whiskers' web page is quieter and more helpful: no extra highlight, a menu of commands on `/`, and a calm "working" line where the eye expects it.

## Context

- `examples/captain-whiskers/web/index.html`: the box gets a gold border on focus (`.box:focus-within`) on top of its own border and shadow, which reads as an extra, unneeded highlight.
- Typing `/` offers nothing: the terminal chats complete commands, the page doesn't. The controller's state has the command names (`ChatState.commands`), not what each does; the SDK's `supportedCommands()` gives a description and an argument hint for each (the agent's, its extensions' such as `/jokebook:best-jokes`, the kit's such as `/knowledge:query`).
- The spinner turns every 0.8 s and the activity line ("Working · 12 s") sits centered above the prompt.

## Changes

- The box: one subtle focus state (a slightly stronger border, no gold ring); the same in light and dark.
- Kit: the controller keeps each command's description and argument hint (e.g. `ChatState.commandDetails`, or `commands` as objects), from `supportedCommands()` and its own (`/resume`, `/plan`, `/extensions`).
- `/` at the start of the box opens a menu above it: each command with its description, filtered as the person types, ↑/↓ and Enter or a click to pick (an argument hint, like `<question>`, leaves the cursor after it), Esc to close; grouped by where it comes from (the captain's, his extensions', the kit's). Usable by touch.
- The spinner turns slower (about 1.4 s) and the activity line is left-aligned, on the prompt bar's left edge, above it.

## Acceptance

- Focusing the box shows no gold ring, in both themes.
- Typing `/` lists the captain's commands, `/jokebook:best-jokes` and the kit's, with what each does; `/kn` narrows to the knowledge ones; Enter sends or fills it.
- While a turn runs, the line sits left above the box with a calm spinner.
