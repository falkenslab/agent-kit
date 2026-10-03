---
sidebar_position: 6
title: Interaction port
description: The InteractionPort interface, the ports the kit installs, and writing your own for a desktop app.
---

# Interaction port

An `InteractionPort` is the UI side of a checkpoint: how a host shows a question and reads a person's answer. It lives in the core, so the checkpoints never depend on a terminal.

```ts
interface ApprovalPrompt {
  title: string;
  lines: string[];
  /** The question in a plain terminal; defaults to the approve/reject one. */
  question?: string;
}

interface InteractionPort {
  /** A step-gate or approval checkpoint; resolves to the raw answer ("", "y", "n", "q"…). */
  askDecision(prompt: ApprovalPrompt, signal: AbortSignal): Promise<string>;
  /** Waits until the person confirms they intervened by hand (e.g. logged in). */
  askManualIntervention(prompt: ApprovalPrompt, signal: AbortSignal): Promise<string>;
  /** Optional: a free-text answer, case kept ("" for none), e.g. a file's path for request_file. */
  askText?(prompt: ApprovalPrompt, signal: AbortSignal): Promise<string>;
  /** A one-way message for the person. */
  notify(message: string): void;
}
```

One port is installed per process: `setInteractionPort(port)` and `getInteractionPort()`.

`askText` is optional: a port without it gets the question through `askDecision`, which a terminal reads as text anyway; the kit's own ports implement it (the Ink port with a text field: Enter sends, Esc answers nothing). Its answer keeps its case, unlike a decision's.

## The ports the kit installs

| When | Port | How it asks |
| --- | --- | --- |
| Importing the package | `terminalInteractionPort` | Prints the checkpoint and asks with `readline` (on the chat's own interface when `runChatTui()` is running). |
| While `runChatInk()` or `createProgressView()` runs | the Ink port | A panel inside the Ink view; restored to the previous port when the chat or view ends. |

Without a TTY the terminal port prints nothing and never answers, so the [response file](response-file.md) is the only channel.

## Rules for a port

- **Resolve with the raw answer**: `"y"`, `"n"`, `"q"`, `""`… The kit lowercases and trims it.
- **Never resolve if you can't ask.** Return a promise that stays pending (for example, when no window is open) so the response file can win.
- **Honor `signal`.** It aborts when the other channel answered first: close your dialog and leave the UI usable. Don't resolve after an abort.
- **Don't throw for normal cases.** A rejected promise is treated like "can't ask": the file channel stays in the race.

## A port for an Electron app

The main process runs the agent (the core has no terminal code), and asks the renderer through IPC:

```ts title="main/interaction.ts"
import { ipcMain, type BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import { setInteractionPort, type ApprovalPrompt, type InteractionPort } from "@falkenslab/agent-kit";

export function installWindowPort(window: BrowserWindow): void {
  const ask = (kind: "decision" | "manual", prompt: ApprovalPrompt, signal: AbortSignal) =>
    new Promise<string>((resolve) => {
      if (window.isDestroyed()) return; // can't ask: let the response file answer
      const id = randomUUID();
      const onAnswer = (_event: unknown, answer: { id: string; value: string }) => {
        if (answer.id !== id) return;
        ipcMain.off("checkpoint:answer", onAnswer);
        resolve(answer.value);
      };
      ipcMain.on("checkpoint:answer", onAnswer);
      signal.addEventListener(
        "abort",
        () => {
          ipcMain.off("checkpoint:answer", onAnswer);
          window.webContents.send("checkpoint:cancel", { id });
        },
        { once: true },
      );
      window.webContents.send("checkpoint:ask", { id, kind, prompt });
    });

  const port: InteractionPort = {
    askDecision: (prompt, signal) => ask("decision", prompt, signal),
    askManualIntervention: (prompt, signal) => ask("manual", prompt, signal),
    notify: (message) => window.webContents.send("agent:notice", message),
  };
  setInteractionPort(port);
}
```

The renderer shows a dialog on `checkpoint:ask`, sends `checkpoint:answer` with `"y"`, `"n"` or `"q"` (or `""` for a manual intervention), and closes the dialog on `checkpoint:cancel`.

## Answering through the file only

```ts
setInteractionPort(null);
```

Every checkpoint then waits for `<runDir>/approval-response.txt`. Useful for tests and fully remote supervision.

## Reusing the terminal port

`terminalInteractionPort` is exported, with `setSharedReadline(rl)` and `getSharedReadline()`, for a program that has its own `readline` interface and wants checkpoints asked on it rather than on a second one fighting it for the keyboard.
