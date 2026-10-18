---
sidebar_position: 1
title: Ejecuciones y reanudación
description: Las carpetas de las ejecuciones, el almacén de sesiones que guarda cada conversación en su carpeta, --continue, /resume y la API que hay detrás.
---

# Ejecuciones y reanudación

Una **ejecución** es una puesta en marcha de un agente. Con una carpeta de ejecuciones, cada ejecución tiene una carpeta propia que guarda su log de la sesión, su transcripción de herramientas y la conversación completa, para que la persona pueda retomarla más tarde.

## Cómo activarlo {#turning-it-on}

Dale al chat una carpeta de ejecuciones y un **abridor de sesión** en lugar de opciones fijas:

```ts
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  historyPath: path.resolve(".run/history.jsonl"),
});
```

El abridor recibe un `RunFolder` (`{ dir, sessionId }`) y devuelve las opciones de la sesión. Pasar `{ run }` a `buildSessionOptions()` es lo que guarda la conversación en `run.dir` y reanuda `run.sessionId` cuando lo hay.

## Qué contiene la carpeta de una ejecución {#what-a-run-folder-holds}

```text
.run/
├── history.jsonl                 ↑/↓ history (historyPath), shared by every run
└── 2026-09-29T10-15-00-000Z/     one run, named after its start time (UTC)
    ├── session.log               what the terminal showed, plain text
    ├── transcript.jsonl          tool calls and results, secrets redacted
    ├── conversation.jsonl        the SDK's transcript of the conversation
    ├── subagents/
    │   └── agent-a67….jsonl      each subagent's transcript
    └── session.json              { "sessionId": "…", "subagents": { … } }
```

Una ejecución que todavía no tiene conversación solo tiene `session.log`. `session.json` aparece con el primer mensaje y asocia a ficheros el id de sesión del SDK y las transcripciones de sus subagentes.

## Reanudar {#resuming}

| Cómo | Qué pasa |
| --- | --- |
| `--continue` en la línea de comandos | El chat arranca con la última ejecución que tiene conversación: se vuelve a dibujar y la sesión se reanuda. |
| `/resume` en el chat | Una lista de ejecuciones (fecha y último mensaje de la persona, de la más reciente a la más antigua) en lugar del prompt: ↑/↓ y Enter eligen una, Esc cancela. El chat plano pide un número. |

Cuando se reanuda una ejecución:

- el agente recuerda la conversación completa, subagentes incluidos;
- la conversación se vuelve a dibujar: desde el principio en pantalla completa, y tras lo que ya hay en pantalla en el modo en línea (el scrollback de una terminal no se puede deshacer), y después una línea `(resumed the conversation of <date>)`;
- el `session.log` y el `transcript.jsonl` de la ejecución siguen creciendo en la misma carpeta;
- `initialPrompt` no se vuelve a enviar.

`/resume` construye la sesión de nuevo a través de tu abridor, porque los servidores MCP, la puerta (gate) de pasos y la transcripción están ligados a la carpeta de la ejecución. Una línea escrita durante un turno (`/resume` incluido) espera a que termine el turno.

## Cómo funciona {#how-it-works}

El SDK puede guardar la transcripción de una sesión en otro sitio distinto del predeterminado mediante un **`SessionStore`**, un adaptador al que llama a medida que crece la transcripción (`append`) y antes de reanudar (`load`). `createRunStore(dir)` es uno que guarda una sesión en la carpeta de una ejecución:

- `append(key, entries)` escribe la transcripción principal en `conversation.jsonl` y la de cada subagente en `subagents/<name>.jsonl`, en orden, saltándose las entradas que ya tiene (por `uuid`);
- `load(key)` las vuelve a leer cuando el SDK reanuda; `listSubkeys()` lista las transcripciones de los subagentes para que también vuelvan.

La reanudación se comprobó contra el SDK real: una sesión reanudada recuerda la conversación, subagentes incluidos, incluso con la copia propia de la CLI borrada, y conserva su id de sesión.

:::note La CLI guarda su propia copia
Mientras se usa un almacén, la CLI sigue escribiendo su propia copia en `~/.claude/projects/`. No se puede desactivar.
:::

## La API {#the-api}

Todo lo que usan los chats se exporta, para un host que construya su propia interfaz de reanudación:

```ts
import { createRunFolder, createRunStore, listRuns, readConversation } from "@falkenslab/agent-kit";

// The runs with a conversation, newest first.
const runs = await listRuns(runsDir);
// [{ dir, sessionId, updatedAt: Date, lastMessage: "…" }, …]

// What was said, to redraw it: the person's messages and the agent's replies.
const messages = await readConversation(runs[0].dir);
// [{ role: "user", text: "…" }, { role: "assistant", text: "…" }, …]

// A new run folder.
const run = await createRunFolder(runsDir); // { dir, sessionId: null }

// Options that keep the conversation in the folder (and resume it).
const { options } = await buildSessionOptions(config, run.dir, spec, { run });
// …or by hand: { ...options, sessionStore: createRunStore(run.dir), resume: run.sessionId ?? undefined }
```

| Función | Devuelve |
| --- | --- |
| `createRunFolder(runsDir)` | un `RunFolder` nuevo (`<runsDir>/<timestamp>/`) |
| `listRuns(runsDir)` | `RunSummary[]`: las ejecuciones con un `session.json`, de la más reciente a la más antigua |
| `readConversation(dir)` | `ConversationMessage[]`: los mensajes de la persona y las respuestas de texto del agente (sin las llamadas a herramientas, los resultados de las herramientas ni las expansiones de los comandos con barra) |
| `createRunStore(dir)` | un `SessionStore` ligado a esa carpeta |

## Lo que conviene saber {#things-to-know}

- **Las carpetas de ejecuciones son sensibles.** La transcripción del SDK no oculta los secretos. Mantenlas fuera del control de versiones.
- **Las ejecuciones antiguas** sin `session.json` (de antes de las carpetas de ejecuciones, o que nunca recibieron un mensaje) no se listan.
- **Se crea una carpeta de ejecución en cada arranque**, aunque la persona reanude otra enseguida.
- **`SessionStore` es una API alfa** del SDK: se vuelve a comprobar en cada actualización del SDK en el kit.
