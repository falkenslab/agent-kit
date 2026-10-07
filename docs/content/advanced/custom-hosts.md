---
sidebar_position: 3
title: Custom hosts
description: Run an agent without a terminal - an Electron app, a server, a sidecar - with the kit's core.
---

# Custom hosts

The kit's core never writes to the terminal, so the same agent can run inside a desktop app, a server or a web page. The chat's own logic (opening the session, the person's lines and commands, the turns, `/resume`, `/extensions`, the mode, the checkpoints, the session log and the history) lives in a **chat controller** without an interface: the terminal chats are views of it, and a host of your own is one more.

## The chat controller

`createChatController()` takes what `runChatInk()` takes, the options or a session opener, and settings much like the chat's options:

```ts
import { buildSessionOptions, createChatController } from "@falkenslab/agent-kit";

const chat = await createChatController((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir, // each run in its folder, resumable
  historyPath: path.join(runsDir, "history.jsonl"),
  panels: "state", // checkpoints become part of the state (see below)
});

chat.subscribe((state) => window.webContents.send("chat:state", state)); // plain data, every change
await chat.start(); // draws the run's earlier conversation, sends the initial prompt
await chat.send("Tell me a joke"); // a line: a command, or a turn (resolves when it ends)
```

**Its state** (`getState()`, and every change through `subscribe()`) is plain data, the same for any view, safe to send over IPC or HTTP:

| Field | What it holds |
| --- | --- |
| `transcript` | The conversation in blocks: the person's lines (`user`), the agent's markdown (`agent`), groups of tool calls with their labels, results and subagents' actions (`tools`), notices (`notice`, with a tone: `plain`, `dim`, `warn`, `error`) and how long each turn took (`turn-summary`). |
| `busy`, `turnStartedAt`, `activity`, `subagentActivity` | A turn running, since when, and what the agent and a subagent are doing now. |
| `todos` | The agent's task list, while a task is open. |
| `mode`, `switchableModes` | The mode, and the ones the person can switch to. |
| `turns`, `usage`, `contextPercent` | Turns so far, tokens used, how full the context window is. |
| `suggestion` | The model's predicted next prompt. |
| `commands`, `history` | The slash commands the person can type, and their earlier lines. |
| `panel` | A checkpoint waiting for an answer, with `panels: "state"`: an approval (`decision`), a confirmation after a manual step (`manual`), free text (`text`) or a choice (`choice`, with its options). |
| `choice` | A choice in place of the prompt (the conversations to resume), without `pick`. |
| `run`, `extensions` | The run in use, and the extensions: what runs, what's off and why, what's installed. |

**Its actions**:

| Action | What it does |
| --- | --- |
| `send(line)` | A line the person sent: an exit command (resolves to `"exit"`), one of the chat's commands (`/resume`, `/plan`, `/extensions`), an unknown slash command (a warning, never sent), or a turn. |
| `interrupt()` | Stops the turn running. |
| `setMode(mode)`, `cycleMode()`, `togglePlan()` | Switches the mode as the session allows. |
| `listRuns()`, `resume(dir?)` | The runs to resume, and switching to one (without `dir`, it asks: `pick`, or the state's `choice`). |
| `setExtension(name, enabled)` | Enables or disables an installed extension and opens the session again, keeping the conversation. |
| `answer(panelId, answer)` | Answers the state's `panel`: `"y"`/`"n"` for a decision, the text, or the chosen options' numbers (`"1,3"`, and "Other" text on the next lines). |
| `choose(value)` | Answers the state's `choice` (`null` cancels). |
| `notice(text, tone)` | A notice of the host's (a welcome), in the transcript and the session log. |
| `close()` | Ends the agent run, the session log and its interaction port. |

A view that draws as things happen (a terminal) follows `onEvent()` instead: the agent's events, the person's lines, notices, the start and end of a turn, an earlier conversation to draw, a mode change, a session opened again.

**Checkpoints**: with `panels: "state"` the controller installs its own [interaction port](../human-in-the-loop/interaction-port.md), and a checkpoint waits in the state's `panel` until `answer()`; the [response file](../human-in-the-loop/response-file.md) still works alongside. With `panels: "view"` (the default) the host installs its own port, as the terminal chats do.

## An Electron main process

```ts title="main/agent.ts"
import path from "node:path";
import { app, ipcMain, type BrowserWindow } from "electron";
import { buildSessionOptions, createChatController, resolveClaudeAuth, setLanguage } from "@falkenslab/agent-kit";
import { spec, type Config } from "./spec.js";

export async function startAgent(window: BrowserWindow, workspace: string): Promise<void> {
  if (!resolveClaudeAuth({ claudeCodeOAuthToken: await readTokenFromKeychain() })) {
    window.webContents.send("agent:needs-login");
    return;
  }
  setLanguage(app.getLocale().startsWith("es") ? "es" : "en");

  const runsDir = path.join(app.getPath("userData"), "runs");
  const config: Config = { mode: "guided", projectDir: workspace, knowledgeDir: path.join(workspace, "knowledge") };
  const chat = await createChatController((run) => buildSessionOptions(config, run.dir, spec, { run }), { runsDir, panels: "state" });

  chat.subscribe((state) => window.webContents.send("chat:state", state));
  ipcMain.handle("chat:send", (_event, line: string) => chat.send(line));
  ipcMain.on("chat:interrupt", () => chat.interrupt());
  ipcMain.on("chat:mode", (_event, mode: "guided" | "interactive" | "plan") => chat.setMode(mode));
  ipcMain.on("chat:answer", (_event, panelId: number, answer: string) => chat.answer(panelId, answer));
  window.on("closed", () => chat.close());
  await chat.start();
}
```

The renderer draws `chat:state`: the transcript, a spinner while `busy`, the mode, and a dialog for `panel`.

## Things to take care of

- **Don't import the terminal UI at startup if you don't need it.** Everything is exported from the package root; importing it installs the terminal interaction port, which `panels: "state"` (or your own `setInteractionPort()`) replaces. The terminal port does nothing without a TTY anyway.
- **One language and one theme per process.** Set the language with `setLanguage()` before building options; themes only affect the terminal UI.
- **Credentials**: `resolveClaudeAuth()` never prompts; getting a token (a login screen that runs `claude setup-token`, a settings field) is your host's job.
- **Where run folders go**: somewhere private to the user (`app.getPath("userData")`), since they hold whole conversations.
- **Your own reader instead**: a host can still drive `runQuery()` and `createInputQueue()` itself. Then `prompt-suggestion` arrives after `turn-end` and `mcp-error` before the first turn: keep one reader for the whole session.

## A server

The same controller works in an HTTP server: one per conversation, its state streamed to the client (server-sent events, a WebSocket), the person's actions as requests, and `panels: "state"` for checkpoints. The interaction port is one per process, so one conversation with checkpoints at a time per process. Remember that each session runs a CLI subprocess: limit how many run at once.
