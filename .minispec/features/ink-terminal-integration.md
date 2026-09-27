# Terminal integration for the Ink chat

## Goal

Let the chat show its state outside itself: in the tab title, in the Windows taskbar, and give a quick way to copy the last reply.

## Context

- Windows Terminal supports OSC 0 (window title), OSC 9;4 (taskbar progress: indeterminate, paused, cleared) and OSC 52 (set the clipboard), and reports focus changes with `?1004h`.
- The Ink chat knows when a turn starts and ends, its header title, and the reply text.

## Changes

- Title: `✻ <title> — working…` during a turn, `<title>` when idle (the header's title, or an option); cleared on exit.
- Taskbar: indeterminate progress during a turn; at its end, if the window isn't focused, a paused (attention) state until it gets focus again; cleared on exit.
- `/copy`: a local command (not sent to the model) that copies the last reply, as plain text, to the clipboard with OSC 52, and says so.
- A `terminalIntegration` option (on by default in `runChatInk()`) to turn it all off.

## Acceptance

- In captain-whiskers on Windows Terminal: the tab title and the taskbar show the turn; switching to another window while it works leaves the taskbar button marked until coming back; `/copy` puts the last reply in the clipboard.
- Nothing of this is written without a TTY or with the option off.
- Tests for the escape sequences written at each point.
- typecheck, lint, tests and captain-whiskers pass.
