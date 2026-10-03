# The SDK's task list, shown in the chat

Issue: [#16](https://github.com/falkenslab/agent-kit/issues/16)

## Goal

Agents keep a task list with the SDK's `TodoWrite` tool on long jobs, and the Ink chat shows it live above the prompt.

## Context

- On long jobs (ingesting ten sources, building a whole topic) an agent can lose track: skip steps or repeat work. Claude Code keeps a task list with `TodoWrite`, and shows it.
- The kit passes the SDK an explicit tool list, so `TodoWrite` isn't offered.

## Changes

- Confirm empirically that the SDK accepts `TodoWrite` in the explicit `tools` list, which events its calls produce (input with the whole list, result) and how subagents' calls arrive. Record it as "confirmed empirically".
- `buildSessionOptions()` adds `TodoWrite` to `tools` and `allowedTools` in every mode; a spec can leave it out with `disallowedTools`. The plan gate allows it (it changes nothing; a plan can be a task list).
- The session model keeps the latest list from the main agent's `TodoWrite` calls.
- Ink chat and progress view: the list above the prompt while any task isn't done (`☐` pending, `◼` in progress, `☑` done, the one in progress highlighted), hidden when all are done or the turn ends with none left. `TodoWrite` calls don't show as tool calls in the history, and the spinner's label shows the task in progress.
- Plain chat and console renderer (session log): one line when a task starts or is done.
- Labels and phrases in the four languages.
- Docs: the Ink chat guide (what's on screen), session options (tools), and a note in the human-in-the-loop or prompts guide on when agents use it.

## Acceptance

- A session has `TodoWrite`; `disallowedTools` removes it.
- In the Ink chat, a list written by the agent shows above the prompt, updates as tasks change, and goes away when all are done; no `TodoWrite` call appears in the history.
- The session log records tasks started and done.
- Tests for the session model and the view; `verify` passes.
