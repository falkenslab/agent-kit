---
sidebar_position: 3
title: Custom hosts
description: Run an agent without a terminal - an Electron app, a server, a sidecar - with the kit's core.
---

# Custom hosts

The kit's core never writes to the terminal, so the same agent can run inside a desktop app or a server. A host needs to do four things:

1. build the session options (`buildSessionOptions()`), exactly as a terminal agent does;
2. run the session and forward its events (`runQuery()` with `createInputQueue()`);
3. answer checkpoints (install an [`InteractionPort`](../human-in-the-loop/interaction-port.md));
4. show everything in its own UI.

## An Electron main process

```ts title="main/agent.ts"
import path from "node:path";
import { app, ipcMain, type BrowserWindow } from "electron";
import {
  buildSessionOptions,
  createFriendlyToolLabel,
  createInputQueue,
  createRunFolder,
  resolveClaudeAuth,
  runQuery,
  setLanguage,
} from "@falkenslab/agent-kit";
import { spec, type Config } from "./spec.js";
import { installWindowPort } from "./interaction.js";

export async function startAgent(window: BrowserWindow, workspace: string): Promise<void> {
  if (!resolveClaudeAuth({ claudeCodeOAuthToken: await readTokenFromKeychain() })) {
    window.webContents.send("agent:needs-login");
    return;
  }

  setLanguage(app.getLocale().startsWith("es") ? "es" : "en");
  installWindowPort(window); // checkpoints become dialogs in the window

  const runsDir = path.join(app.getPath("userData"), "runs");
  const run = await createRunFolder(runsDir);
  const config: Config = { mode: "guided", projectDir: workspace, knowledgeDir: path.join(workspace, "knowledge") };
  const { options, modeControl } = await buildSessionOptions(config, run.dir, spec, { run });

  // With the mode control, a switch into or out of plan mode is told to the model with the next message.
  const queue = createInputQueue({ modeControl });
  const session = runQuery(queue.iterable, options);
  const label = createFriendlyToolLabel();

  // One reader for the whole session: forward every event, with a friendly label for actions.
  void (async () => {
    const events = session.events[Symbol.asyncIterator]();
    while (true) {
      const { value, done } = await events.next();
      if (done) break;
      const labelled = value.type === "action" || value.type === "subagent-action" ? { ...value, label: label(value.toolName, value.input) } : value;
      window.webContents.send("agent:event", labelled);
    }
    window.webContents.send("agent:closed");
  })();

  ipcMain.on("agent:send", (_event, text: string) => queue.push(text));
  ipcMain.on("agent:interrupt", () => void session.interrupt());
  ipcMain.on("agent:mode", (_event, mode: "guided" | "interactive" | "plan") => modeControl.set(mode));
  window.on("closed", () => {
    queue.end();
    session.close();
  });
}
```

The renderer draws the conversation from `agent:event` messages: append `text` events to the current reply, show `action` events with their `label`, attach `tool-result`s by `toolUseId`, and close a turn on `turn-end`.

## Things to take care of

- **Don't import the terminal UI at startup if you don't need it.** Everything is exported from the package root; importing it installs the terminal interaction port, which you replace with yours (`setInteractionPort()`). The terminal port does nothing without a TTY anyway.
- **One language and one theme per process.** Set the language with `setLanguage()` before building options; themes only affect the terminal UI.
- **Credentials**: `resolveClaudeAuth()` never prompts; getting a token (a login screen that runs `claude setup-token`, a settings field) is your host's job.
- **Where run folders go**: somewhere private to the user (`app.getPath("userData")`), since they hold whole conversations.
- **Event order**: `prompt-suggestion` arrives after `turn-end`; `mcp-error` before the first turn. Keep one reader for the whole session.

## A server

The same pieces work in an HTTP server: one session per conversation, events streamed to the client (server-sent events, a WebSocket), messages pushed into the session's queue, and checkpoints answered through an interaction port that waits for an HTTP request, or through the [response file](../human-in-the-loop/response-file.md). Remember that each session runs a CLI subprocess: limit how many run at once.
