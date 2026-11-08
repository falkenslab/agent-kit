---
sidebar_position: 7
title: Puerto de interacción
description: La interfaz InteractionPort, los puertos que instala el kit, y cómo escribir el tuyo para una aplicación de escritorio.
---

# Puerto de interacción

Un `InteractionPort` es el lado de interfaz de un punto de control: cómo un host muestra una pregunta y lee la respuesta de una persona. Vive en el núcleo, así que los puntos de control nunca dependen de un terminal.

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
  /** Optional: a choice; resolves to the numbers ("1", "1,3") and/or the person's own words on the next line. */
  askChoice?(prompt: ApprovalPrompt, choice: { options: readonly string[]; multiple: boolean }, signal: AbortSignal): Promise<string>;
  /** Optional: a form an MCP server asks for, whole; resolves to { action, content? }. */
  askForm?(form: FormRequest, signal: AbortSignal): Promise<FormAnswer>;
  /** A one-way message for the person. */
  notify(message: string): void;
}
```

Se instala un puerto por proceso: `setInteractionPort(port)` y `getInteractionPort()`.

`askForm` también es opcional: sin él, [un formulario que pide un servidor](elicitation.md) se pregunta campo a campo a través de los demás métodos; el puerto del controlador del chat (`panels: "state"`) lo tiene. `askText` y `askChoice` son opcionales: un puerto que no los tiene recibe la pregunta a través de `askDecision` (una elección con sus opciones numeradas en las líneas), que un terminal lee como texto de todos modos; los puertos propios del kit implementan ambos (el puerto de Ink con un campo de texto, y una lista con "Other"). Sus respuestas respetan mayúsculas y minúsculas, a diferencia de las de una decisión. Un `ApprovalPrompt` con `markdown: true` (un plan) debería representarse como markdown donde la interfaz pueda.

## Los puertos que instala el kit {#the-ports-the-kit-installs}

| Cuándo | Puerto | Cómo pregunta |
| --- | --- | --- |
| Al importar el paquete | `terminalInteractionPort` | Imprime el punto de control y pregunta con `readline` (en la propia interfaz del chat cuando se está ejecutando `runChatTui()`). |
| Mientras se ejecuta `runChatInk()` o `createProgressView()` | el puerto de Ink | Un panel dentro de la vista de Ink; se restaura el puerto anterior cuando termina el chat o la vista. |

Sin TTY el puerto del terminal no imprime nada y nunca responde, así que el [fichero de respuesta](response-file.md) es el único canal.

## Reglas para un puerto {#rules-for-a-port}

- **Resuelve con la respuesta en bruto**: `"y"`, `"n"`, `"q"`, `""`… El kit la pasa a minúsculas y le quita los espacios alrededor.
- **Nunca resuelvas si no puedes preguntar.** Devuelve una promesa que se quede pendiente (por ejemplo, cuando no hay ninguna ventana abierta) para que pueda ganar el fichero de respuesta.
- **Respeta `signal`.** Aborta cuando el otro canal ha respondido primero: cierra tu diálogo y deja la interfaz utilizable. No resuelvas después de un aborto.
- **No lances excepciones en los casos normales.** Una promesa rechazada se trata como "no puedo preguntar": el canal del fichero sigue en la competición.

## Un puerto para una aplicación Electron {#a-port-for-an-electron-app}

El proceso principal ejecuta el agente (el núcleo no tiene código de terminal) y pregunta al renderer a través de IPC:

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

El renderer muestra un diálogo con `checkpoint:ask`, envía `checkpoint:answer` con `"y"`, `"n"` o `"q"` (o `""` para una intervención manual), y cierra el diálogo con `checkpoint:cancel`.

## Responder solo a través del fichero {#answering-through-the-file-only}

```ts
setInteractionPort(null);
```

Cada punto de control espera entonces a `<runDir>/approval-response.txt`. Útil para tests y para una supervisión totalmente remota.

## Reutilizar el puerto del terminal {#reusing-the-terminal-port}

`terminalInteractionPort` se exporta, con `setSharedReadline(rl)` y `getSharedReadline()`, para un programa que tiene su propia interfaz `readline` y quiere que los puntos de control se pregunten en ella, en lugar de en una segunda que le dispute el teclado.
