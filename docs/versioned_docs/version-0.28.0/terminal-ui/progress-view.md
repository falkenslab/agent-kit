---
sidebar_position: 3
title: Progress view
description: createProgressView() and createConsoleRenderer() - showing a one-shot run's progress in a terminal.
---

# Progress view

A one-shot run (a job that does one task and ends) has no prompt, but a person watching it still wants to see what's happening and to answer checkpoints. `createProgressView()` is the chat's screen without the prompt: the live reply, tool calls, spinner, approval panels and status bar.

```ts
import { buildSessionOptions, createProgressView, runQuery } from "@falkenslab/agent-kit";

const { options } = await buildSessionOptions(config, runDir, spec);
const view = createProgressView({ mode: config.mode, agentLabel: "Scout>" });

const run = runQuery("Update the knowledge base with the new files in sources/", options);
for await (const event of run.events) view.render(event);

await view.close(); // removes the live area and restores the interaction port
console.log("Done.");
```

Without a TTY, or with `plain: true`, it's `createConsoleRenderer()` (plain lines), with a no-op `close()`.

## Options

| Option | Description |
| --- | --- |
| `formatAction` | Tool call labels. See [Tool labels](tool-labels.md); `withToolLabels()` adds the extensions' ([An extension's labels](tool-labels.md#an-extensions-labels)). |
| `toolPhrase` | How your tools count in a folded summary. |
| `toolDetail` | How much of the tool calls shows: `"full"` (default), `"calls"` or `"summary"`. See [Tool labels](tool-labels.md#how-much-shows). |
| `formatResult` | Your own result line per tool, or none. See [Tool labels](tool-labels.md#results-for-your-tools). |
| `agentLabel` | The label before the reply in plain output. |
| `onWrite` | Called with everything the console renderer writes (plain text), e.g. to mirror a log file. |
| `renderApproval` | Your own preview in the approval panels. |
| `mode` | Shown in the status bar. |
| `theme`, `language` | See [Themes](themes.md) and [Languages](../sessions/languages.md). |
| `plain` | Plain console output even on a TTY. |

## The view is a renderer

`ProgressView` has the same methods as the console renderer, so code that prints events works with either:

| Method | What it does |
| --- | --- |
| `render(event)` | Draws one `AgentEvent`. |
| `write(text)`, `writeLine(text)` | Writes your own text above the live area, and to `onWrite`. `writeLine` writes a line of its own; the view draws whole lines, so `write` text shows once its line ends (a `\n` in it, a `writeLine()`, `endLine()` or the next event). |
| `endLine()` | Ends the current line if needed. |
| `startTurn()` | Marks a new turn (the view starts one when created). |
| `close()` | Ends the view. Await it before printing anything else. |

Ctrl+C during a checkpoint answers Stop and raises `SIGINT`, so your own handler can stop the run, and tell the person with `writeLine()`:

```ts
let interrupting = false;
process.on("SIGINT", () => {
  if (interrupting) process.exit(130);
  interrupting = true;
  view.writeLine("Interrupting… (Ctrl+C again to exit without waiting)");
  void run.interrupt();
});
```

## The plain console renderer

`createConsoleRenderer()` prints events as plain lines: the agent's text as it streams, `[action] <label>` per tool call, notices and errors. `runChatTui()` uses it, and so does the session log.

```ts
import { createConsoleRenderer, runQuery } from "@falkenslab/agent-kit";

const renderer = createConsoleRenderer({ agentLabel: "Scout>", onWrite: (text) => log.write(text) });
const run = runQuery("Summarize the notes", options);
for await (const event of run.events) renderer.render(event);
renderer.endLine();
```

`output` replaces where the text goes (standard output by default). Subagent actions, tool results and prompt suggestions aren't printed.
