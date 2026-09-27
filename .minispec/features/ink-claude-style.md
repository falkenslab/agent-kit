# Claude Code look for the Ink UI

## Goal

Make the Ink views (`runChatInk()`, `createProgressView()`) look as close as possible to the Claude Code CLI, including a one-line result under each tool call.

## Context

- The Ink views render every event through `createConsoleRenderer()` (`sessionModel.ts`), so the screen and `session.log` carry the same text: `agentLabel` before the reply, `[action] label` lines, one blank line between kinds of output.
- `runQuery()` emits `action` and `subagent-action` but no tool results: `user` messages with `tool_result` blocks (matched by `tool_use_id`) are dropped.
- Claude Code's look: user lines as `> text` in gray; each assistant block and each tool call behind a `⏺` bullet (`⏺ Tool(main argument)`), its result indented under `⎿`; a spinner like `✻ Thinking… (12s · ↑ 1.2k tokens · esc to interrupt)`; a full-width rounded input box with a hint line under it; permission prompts as a bordered box with numbered choices; a blank line between blocks.
- `ink-fullscreen` (the other feature in flight) builds on this look.

## Changes

- Core: a `tool-result` `AgentEvent` (`toolUseId`, `toolName`, `isError`, `content` summarized as text), with `action` gaining its `toolUseId` to pair them; subagent results stay out, as their actions do. `createConsoleRenderer()` ignores it, so the console and `session.log` don't change.
- Screen formatting apart from the log: the Ink model keeps rendering through `createConsoleRenderer()` only for `onWrite`, and builds the screen from events with its own formatter (bullets, `⎿` result lines, colors).
- Tool labels: `⏺ Tool(argument)` from `createFriendlyToolLabel()`'s description, or a consumer's `formatAction`; result summary from a default (first line, line count, error in red) or a consumer's `formatResult`.
- Spinner with elapsed seconds, tokens and the Esc hint; input as a rounded full-width box with a hint line (mode, turns, tokens) under it.
- Approval panel as Claude Code's permission box: bordered, numbered choices, `y`/`n`/`q` still accepted.
- `agentLabel` no longer shown in the Ink views (the `⏺` bullet replaces it); still used by the console and the log.
- Update captain-whiskers, ADR-014 (screen text no longer equals the log text), `architecture.md`, README.

## Acceptance

- A captain-whiskers session reads like Claude Code: gray `>` user lines, `⏺` replies and tool calls with `⎿` results under them, the spinner line, the rounded input box and the numbered permission box.
- `session.log` and the plain `runChatTui()` output are unchanged.
- Tests: the new event (paired with its action), result summaries, and screen frames of a turn with `ink-testing-library`.
- typecheck, lint, tests and captain-whiskers pass.
