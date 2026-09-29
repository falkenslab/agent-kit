# Tool results in a quieter color

Issue: [#2](https://github.com/falkenslab/agent-kit/issues/2)

## Goal

In the Ink chat, show the one-line result under each tool call (`⎿ …`) dimmed, so only the agent's replies and the human's messages are in the terminal's default color.

## Context

- A tool call is `● <label>` and, under it, `⎿ <result>`: the first line of the result plus "(+N lines)" (`toolGroupExpanded()` and `resultSummary()` in `src/tui/ink/toolGroup.ts`).
- Only the `⎿` and the "(+N lines)" are dimmed; the result's first line ("### Ran Playwright code", "The file … was updated successfully", a path) is in the default color, as bright as the agent's replies. A long session reads as one block of white text.
- Agents already dim their labels through `formatAction` (teacher-agent's `chatToolLabel`), but the result is the kit's own: an agent can't change it.
- Errors must keep standing out: they are red (`ui.error`) today.
- Asked by teacher-agent's user (2026-09-29): "white only for the agent and me".

## Changes

- `resultSummary()` returns the first line dimmed (`ui.dim`), except an error (red, as now). A subagent's answer rendered as markdown is dimmed too, after rendering.
- Same for the compact view of a group of calls, if it shows result text.
- Consider whether the kit should dim tool labels itself (then agents need not do it in `formatAction`); if so, say so in the README and the CHANGELOG so agents that dim already don't double it (dim twice is harmless in ANSI, but check).

## Acceptance

- In captain-whiskers' chat, full screen and `--inline`: tool labels and results are gray, errors red, the agent's replies and the human's messages in the default color. Nothing is cut or misaligned at 80 and 130 columns (`fitWidth` measures visible width).
- `session.log` stays plain text.
- `verify` passes.
