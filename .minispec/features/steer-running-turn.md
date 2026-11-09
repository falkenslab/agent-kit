# Send a message into a running turn

Issue: [#92](https://github.com/falkenslab/agent-kit/issues/92)

## Goal

A chat view can send the agent a message while a turn runs, without stopping it.

## Context

`send()` always starts a new turn and waits for it, and two at once overwrite each other's `turnDone`, so a view can only refuse the message as busy. miyagi's page needs it (falkenslab/miyagi#62).

Confirmed with SDK 0.3.300: a streamed message with `priority: "next"` joins the turn at its next tool boundary (one `result`); with no boundary left, it gets a turn of its own (a second `result`), and several sent then share it. `"now"` cuts the running tool. So `turn-end` no longer says the work is over; `session_state_changed` with `idle` does, once, after the last `result`, with `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1`.

## Changes

- `createInputQueue().push()` takes a priority.
- `runQuery()` asks for the session's state and reports `session-idle`.
- The controller's `steer()`: delivers the message, keeps it in the transcript where it was sent, and the turn ends at `session-idle` when one was steered.
- Commands and exit stay refused while busy; `send()` doesn't change.

## Acceptance

- A message sent during a tool call reaches the model in that turn, which isn't stopped.
- A message sent when no tool is left is answered too, and `busy` lasts until it is.
- A turn without one ends at `turn-end`, as today.
- `steer()` returns false when idle, and for a command or an exit line.
