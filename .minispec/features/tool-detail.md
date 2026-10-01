# How much of the tool calls the chat shows

Issue: [#10](https://github.com/falkenslab/agent-kit/issues/10)

## Goal

Let an agent choose how much the Ink chat and the progress view show of its tool calls: everything, the calls without their results, or one summary line per group. It can also give its own one-line result text per tool.

## Context

- Each tool call is drawn as `● <label>` and, under it, `⎿ <first line of the result> (+N lines)` (`toolGroupExpanded()` and `resultSummary()` in `src/tui/ink/toolGroup.ts`). Groups start unfolded: `expanded: true` in `sessionModel.ts`. Ctrl+O folds them into one line per group, "Read 2 files, ran 1 shell command", built by `toolGroupSummary()` with `toolPhrase`.
- The result line is the tool's raw output, written for the model: Playwright's `### Ran Playwright code`, `### Result` or `### Error (+12 lines)`, and the CLI's `Web search results for query: …`, always in English. Fine for whoever develops an agent; noise for a non-technical user. Reported with miyagi, a teacher's agent built on the kit.
- An agent already controls the labels (`formatAction`) and the group phrases (`toolPhrase`), but not the results nor whether groups start folded.

## Changes

- A `toolDetail?: "full" | "calls" | "summary"` option on `runChatInk()` and `createProgressView()`:
  - `"full"` (default): today's view.
  - `"calls"`: each call without its result line. A failed call keeps a short line in the error color, in the kit's language (e.g. "Couldn't complete it"), not the tool's error text.
  - `"summary"`: groups start folded into their one-line summary.
- Ctrl+O still unfolds and folds in every level. In `"calls"`, unfolding shows the results.
- A `formatResult?(toolName, result: { isError, text }) => string | null | undefined` option: a string replaces the result line, `null` hides it, `undefined` keeps the kit's. It mirrors `formatAction` for labels.
- The kit's messages: the short failure text in the four languages.
- `session.log` and `transcript.jsonl` are unchanged: only the screen changes.
- Docs: the Ink chat, progress view and tool labels guides (the three levels with a screen of each, and `formatResult` with an example for Playwright's results); a recipe for a non-technical audience.
- captain-whiskers: keep `"full"`; mention the option in its README.

## Acceptance

- With `toolDetail: "calls"`, no `⎿` result line shows for successful calls, and a failed one shows the short failure line. With `"summary"`, a group shows as one line until Ctrl+O. With `"full"` or no option, nothing changes.
- `formatResult` replaces, hides or keeps a result line as it returns.
- The session log is identical whatever the level.
- Tests on the session model and `toolGroup` for each level and for `formatResult`.
- `verify` passes.
