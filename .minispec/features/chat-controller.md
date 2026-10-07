# A chat controller without an interface

Issue: [#39](https://github.com/falkenslab/agent-kit/issues/39)

## Goal

The chat's logic lives once, in a controller that takes actions and gives a serializable state, and the terminal chats are views of it: the base for the web and desktop interfaces (ADR-026, phase 1).

## Context

- `runChatInk()` (`src/tui/ink/runChatInk.tsx`, ~635 lines) and `runChatTui()` (`src/tui/chatTui.ts`, ~475) each open and reopen the session (`openSession()`, `reopen()`), keep the input queue and the agent run, handle `/resume`, `/extensions`, `/plan`, `/copy`, exit commands and unknown slash commands, keep the session log and the history; only the drawing differs. `/extensions` and the reopening were just written twice (#37).
- `createSessionModel()` (`src/tui/ink/sessionModel.ts`) already turns events into a transcript (tool groups, labels, results, subagents, the task list), but its output is terminal text and it lives under Ink.
- The panels go through the interaction port (ADR-013): approval, `ask_human` choices, the plan, `request_file`, manual intervention.

## Changes

- `createChatController(options | opener, settings)` in a layer of its own (no terminal, no Ink): actions (`send(text)`, `interrupt()`, `setMode(mode)`, `resume(run)`, `listRuns()`, `setExtension(name, enabled)`, `answer(panelId, answer)`, `close()`) and a state it publishes on every change (`subscribe(listener)`): messages (the person's, the agent's markdown), tool calls with their labels and results, grouped; subagent activity; the task list; the panel waiting for an answer, if any; the mode and what it can switch to; whether a turn is running; context use; the run and the installed extensions. All plain data.
- An interaction port the controller provides: a panel becomes part of the state, answered with `answer()`.
- The slash commands become actions; the controller still understands them typed, so the terminal chats keep them.
- `runChatInk()` and `runChatTui()` draw the controller's state and send it the keys and lines; their options and behavior don't change (their tests keep passing).
- The text rendering (labels, groups, results, `toolDetail`) stays shared, so the terminal and the web show the same thing.

## Acceptance

- Both terminal chats behave as before: `/resume`, `/extensions`, `/plan`, `/copy`, the panels, Shift+Tab, Esc, Ctrl+O, the session log, the history.
- A test drives the controller with a fake agent run, without a terminal: send, a tool call, a panel answered, a mode switch, a resume.
- `verify` passes.
