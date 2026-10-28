---
sidebar_position: 1
title: Eventos
description: runQuery() y el flujo de AgentEvent, createInputQueue() para sesiones de varios turnos, y cómo leer los eventos correctamente.
---

# Eventos

`runQuery()` envuelve el `query()` del SDK y convierte su flujo de mensajes en bruto en unos pocos eventos normalizados. Es lo que usan los chats, y sobre lo que construye cualquier otro host (una aplicación de escritorio, un servidor, un test).

```ts
function runQuery(prompt: string | AsyncIterable<SDKUserMessage>, options: Options): AgentRun;

interface AgentRun {
  events: AsyncIterable<AgentEvent>;
  interrupt(): Promise<unknown>; // stops the current turn, not the session
  close(): void; // ends the session
  supportedCommands(): Promise<SlashCommand[]>; // the session's slash commands
  contextUsage(): Promise<ContextUsage | null>; // { percentage, totalTokens, maxTokens }
}
```

- Un prompt que es una **cadena** es una ejecución de una sola vez: un turno, y los eventos terminan.
- Un **iterable asíncrono** de mensajes del usuario es una sesión de varios turnos: consulta [`createInputQueue()`](#multi-turn-sessions).

## Los eventos {#the-events}

```ts
type AgentEvent =
  | { type: "text"; text: string }
  | { type: "action"; toolName: string; input: unknown; toolUseId?: string }
  | { type: "subagent-action"; toolName: string; input: unknown; toolUseId?: string; parentToolUseId?: string }
  | { type: "tool-result"; toolUseId: string; toolName: string; isError: boolean; text: string }
  | { type: "mcp-error"; failedServers: string[] }
  | { type: "info"; text: string; level: "info" | "notice" | "suggestion" | "warning" | "local-command" }
  | { type: "turn-end"; status: string; failed: boolean; resultText: string | null; errorText: string; usage?: SessionUsage }
  | { type: "prompt-suggestion"; suggestion: string };
```

| Evento | Cuándo | Notas |
| --- | --- | --- |
| `text` | cada fragmento emitido de la respuesta del agente | Concaténalos. No hay un evento de "bloque iniciado": lleva la cuenta de si el evento anterior fue `text` para añadir una etiqueta. |
| `action` | el agente principal llama a una herramienta | `toolUseId` lo empareja con su `tool-result`. |
| `subagent-action` | un subagente llama a una herramienta | `parentToolUseId` es la llamada a `Agent` que inició el subagente. Se mantiene aparte para que nunca parezca que actuó el agente principal. |
| `tool-result` | vuelve una llamada a una herramienta del agente principal | El resultado como texto plano (sin imágenes ni otras partes); `isError` si falló. Los resultados de los subagentes no se notifican. |
| `mcp-error` | al arrancar, algunos servidores MCP no pudieron conectarse | La sesión sigue sin ellos. |
| `info` | la salida propia de la CLI: la salida de un comando local, un aviso, un comando desconocido | Sin él, un comando con barra desconocido parecía silencio. |
| `turn-end` | ha terminado un turno | **Comprueba `failed`, no `status`**: el SDK puede informar de `status: "success"` en un turno que falló por un error de la API, con el mensaje en `resultText`. `usage` es el total acumulado de la sesión. |
| `prompt-suggestion` | el siguiente mensaje previsto (con `promptSuggestions: true`) | Llega **después** del `turn-end` de su turno. |

```ts
interface SessionUsage {
  inputTokens: number; // including cache reads and writes, all models
  cacheReadTokens?: number; // the part of inputTokens read from the cache: the context sent again on every call
  outputTokens: number;
  costUsd: number; // an estimate, not a bill
}
```

## Una ejecución de una sola vez {#a-one-shot-run}

```ts
const run = runQuery("List the three most recent files in sources/ and summarize them.", options);

let reply = "";
for await (const event of run.events) {
  if (event.type === "text") reply += event.text;
  if (event.type === "action") console.log(`→ ${event.toolName}`);
  if (event.type === "turn-end" && event.failed) throw new Error(event.errorText || event.resultText || "The turn failed");
}
console.log(reply);
```

## Sesiones de varios turnos {#multi-turn-sessions}

Para una conversación, el prompt es un iterable asíncrono que produce un mensaje por turno y **no debe terminar** hasta que termine la conversación: el SDK cierra el transporte en cuanto acaba el iterable. `createInputQueue()` es un único generador de larga duración en el que vas metiendo líneas:

```ts
import { createInputQueue, runQuery } from "@falkenslab/agent-kit";

const queue = createInputQueue();
const run = runQuery(queue.iterable, options);
const events = run.events[Symbol.asyncIterator]();

async function ask(line: string): Promise<string> {
  queue.push(line);
  let reply = "";
  // Read up to this turn's turn-end with manual next() calls, never `for await … break`.
  while (true) {
    const { value, done } = await events.next();
    if (done) return reply;
    if (value.type === "text") reply += value.text;
    if (value.type === "turn-end") return reply;
  }
}

console.log(await ask("Hello!"));
console.log(await ask("What did I just say?"));

queue.end();
run.close();
```

:::danger Nunca hagas `break` en un `for await` sobre `run.events`
`run.events` es un único generador para toda la sesión. Salir de un bucle `for await` con `break` llama a su `return()`, que lo cierra para siempre: el siguiente turno ve `done: true` de inmediato y el resto de la conversación se pierde sin aviso. Lee turno a turno con `events.next()`, como arriba.
:::

Con modos intercambiables, pasa el control de modo de la sesión, `createInputQueue({ modeControl })`: cuando la persona entra en el modo plan o sale de él, el siguiente mensaje lleva un `<system-reminder>` que se lo dice al modelo (consulta [modos](../core-concepts/modes.md#plan)). Los dos chats lo hacen por ti.

`createDeferred()` es un pequeño helper (`{ promise, resolve }`) para avisar de que "este turno ha terminado" entre un bucle lector y el código que lo espera.

## Leer los eventos de forma continua {#reading-events-continuously}

Una interfaz normalmente ejecuta un único lector para toda la sesión y reacciona a los eventos según llegan, porque algunos llegan entre turnos (`prompt-suggestion` después de `turn-end`, `mcp-error` antes del primer turno):

```ts
let turnDone: (() => void) | null = null;

void (async () => {
  while (true) {
    const { value, done } = await events.next();
    if (done) break;
    window.webContents.send("agent:event", value); // forward to a UI
    if (value.type === "turn-end") turnDone?.();
  }
})();

async function send(line: string): Promise<void> {
  const finished = new Promise<void>((resolve) => (turnDone = resolve));
  queue.push(line);
  await finished;
}
```

## Interrumpir {#interrupting}

`run.interrupt()` detiene el turno actual (la tecla Esc en los chats); la sesión sigue abierta y llega un `turn-end`. `run.close()` termina la sesión; es seguro llamarlo desde un manejador de señales mientras todavía se están leyendo eventos.

```ts
process.on("SIGINT", () => void run.interrupt());
```

El `errorText` de un turno interrumpido nunca incluye las líneas internas `[ede_diagnostic]` de la CLI: el kit las filtra.
