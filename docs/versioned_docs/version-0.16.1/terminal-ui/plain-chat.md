---
sidebar_position: 2
title: Plain chat
description: runChatTui() - the readline chat for terminals without Ink, pipes and background runs.
---

# Plain chat

`runChatTui()` is a chat on Node's `readline`: the reply streams as plain lines, tool calls are `[action]` lines, and checkpoints are asked at the prompt. It takes the same options as [`runChatInk()`](ink-chat.md) (the Ink-only ones are ignored) and the same session opener.

```ts
function runChatTui(options: Options | SessionOpener, tuiOptions?: ChatTuiOptions): Promise<void>;
```

`runChatInk()` falls back to it by itself without a TTY or with `plain: true`, so most agents never call it directly. Use it when:

- the agent runs **behind a pipe** or in a CI job: `echo "summarize" | npx tsx agent.ts`;
- the terminal doesn't handle Ink well;
- you want output that's easy to capture or copy.

```ts
await runChatInk(opener, { runsDir, plain: process.env.MY_AGENT_PLAIN === "1" });
```

## What it looks like

```text
Scout is ready. /exit to leave.

you> what's new in TypeScript?
[action] Searching the web for "TypeScript release notes"
[action] Fetching https://devblogs.microsoft.com/typescript/…
Scout> TypeScript 6.0 shipped in March…

you>
```

- `agentLabel` is printed before each reply, and colors it.
- Esc interrupts the turn; Ctrl+C interrupts it, or leaves at an idle prompt.
- ↑/↓ go through the history (`historyPath`).
- An unknown `/command` is caught before it reaches the model.
- The agent's task list (`TodoWrite`) prints a line when a task starts (`[task] ◼ Preparing the slides`) and when it's done (`[task] ☑ Prepare the slides`), not the calls; the session log of every chat gets the same lines.
- `/resume` prints a numbered list of runs and asks for a number.
- `/plan` switches into [plan mode](../core-concepts/modes.md#plan) and back, with the `modeControl` option or a session opener (the plain chat has no Shift+Tab).

## Checkpoints

The chat registers its `readline` interface with `setSharedReadline()`, so a checkpoint asks on the same line editor instead of a second one fighting it for the keyboard:

```text
=== Human confirmation required before publishing ===
Summary: post the weekly summary
Allow this to continue? [Y/n/q]
```

Without a TTY, checkpoints are only answered through the [response file](../human-in-the-loop/response-file.md).

## Driving it from another program

Lines written to its standard input are sent as messages, one per line:

```bash
printf 'summarize the news\n/exit\n' | npx tsx agent.ts
```

Give the chat a moment to start before writing: a line that arrives before the prompt is ready is dropped.
