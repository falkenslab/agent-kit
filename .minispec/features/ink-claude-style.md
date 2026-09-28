# Claude Code look for the Ink UI

## Goal

Make the Ink chat look and behave as close as possible to the Claude Code CLI (layout, glyphs, colors, markdown rendering), with the consumer's own identity instead of Claude Code's.

## Context

- The Ink views render every event through `createConsoleRenderer()` (`sessionModel.ts`), so the screen and `session.log` carry the same text: `agentLabel` before the reply, `[action] label` lines, blank lines between kinds of output. The reply is shown as raw markdown.
- `runQuery()` emits `action` and `subagent-action` but no tool results: `user` messages with `tool_result` blocks (matched by `tool_use_id`) are dropped.
- Reference (Claude Code 2.1, full screen, Windows Terminal), top to bottom:
  - Header: small pixel art, name + version, model · plan, cwd; a tip line under it.
  - User turn: full-width gray-background bar, `❯ ` + text. A slash command the same, its output under it after `⎿`.
  - Tool calls collapsed into one dim summary line ("Read 1 file, ran 2 shell commands").
  - Reply: `●` bullet, text indented two columns, markdown rendered: bold, inline code in blue, bullet and numbered lists.
  - After the turn: `✻ Crunched for 19s · done 22:58`; while running, an animated `✻`-style glyph, a verb, elapsed time, tokens and "esc to interrupt".
  - Input pinned at the bottom between two full-width gray rules: `❯ ` + dim placeholder.
  - Footer: the mode in orange with a cycling hint, plus shortcuts, in dim.
- Typography is the terminal's font; the UI only controls glyphs, colors, bold/dim and backgrounds.
- Alignment: the reference's glyphs (`●` `❯` `⎿` `✻` `─`) are one-column text characters the font draws. Emoji are two columns, come from a fallback font, and sequences (☠️ with a variation selector, 🏴‍☠️ with a zero-width joiner) may be measured differently by `string-width` and by Windows Terminal, which shifts the rest of the row. The spike also padded the user bar by string length, not columns.
- `ink-fullscreen` provides the full-screen layout this look assumes.

## Changes

- Core: a `tool-result` `AgentEvent` (`toolUseId`, `toolName`, `isError`, text content), and `action` gains `toolUseId` to pair them; subagent results stay out, as their actions do. `createConsoleRenderer()` ignores it, so the console and `session.log` don't change.
- Screen apart from the log: the Ink model keeps `createConsoleRenderer()` only for `onWrite` and builds the screen from events with its own blocks (user bar, reply, tool group, turn summary, notice, error).
- Markdown: `marked`'s lexer (no dependencies) plus our own renderer to ANSI in the reference's style (bold, italic, inline code, fenced code blocks (framed, one color: syntax highlighting is left for later, it would add highlight.js), headings, lists, quotes, links, rules; tables as aligned text). While streaming, finished blocks are rendered and the block in progress is shown with inline styles only.
- Tool group: consecutive tool calls fold into one summary line per group ("Read 2 files, searched the web 3 times"); per-tool verbs for the built-in tools, a generic "used N tools" otherwise, and a consumer hook for its own tools. Ctrl+O (as in Claude Code) toggles the groups into `⏺ Tool(argument)` lines with `⎿` result summaries.
- Spinner and turn summary as in the reference; a palette module with the reference's colors (orange accent, blue code, gray user bar), in `ui.ts` style.
- Input: stays in its rounded frame (the user's choice over the reference's two rules). Footer with the mode (`⏵⏵`, orange) and shortcuts; approval panel as a bordered box with numbered choices (`1`-`3` and `y`/`n`/`q`).
- Header: done (`header.art`, fields). Nothing of Claude Code's branding (mascot, name) is shipped.
- Alignment rules (done, keep them): the kit's chrome (header, bars, rules, prompt, footer, spinner, panel) uses one-column glyphs only, never emoji; every pad, cut and wrap is computed in columns (`string-width`), never in string length; emoji are left to free text (replies, the human's lines), where alignment isn't promised.
- `agentLabel` no longer shown in the Ink views (the `●` bullet replaces it); still used by the console and the log.
- Update ADR-014 (screen text no longer equals the log text), `architecture.md`, README.

## Acceptance

- Side by side with the reference screenshot, a captain-whiskers session matches it block for block: header, user bars, folded tool lines, `●` replies with rendered markdown, turn summary, framed input, footer.
- Markdown renders correctly both finished and while streaming (no raw `**`, backticks or list markers left on screen).
- `session.log` and the plain `runChatTui()` output are unchanged.
- Tests: the new event (paired with its action), the markdown renderer (each element, streaming), tool-group summaries, and screen frames with `ink-testing-library`.
- typecheck, lint, tests and captain-whiskers pass.
