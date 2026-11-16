---
sidebar_position: 3
title: Vista de progreso
description: createProgressView() y createConsoleRenderer() - mostrar en una terminal el progreso de una ejecución única.
---

# Vista de progreso

Una ejecución única (un trabajo que hace una tarea y termina) no tiene prompt, pero una persona que la esté observando sigue queriendo ver qué pasa y responder a los puntos de control. `createProgressView()` es la pantalla del chat sin el prompt: la respuesta en vivo, las llamadas a herramientas, el spinner, los paneles de aprobación y la barra de estado.

```ts
import { buildSessionOptions, createProgressView, runQuery } from "@falkenslab/agent-kit";

const { options } = await buildSessionOptions(config, runDir, spec);
const view = createProgressView({ mode: config.mode, agentLabel: "Scout>" });

const run = runQuery("Update the knowledge base with the new files in sources/", options);
for await (const event of run.events) view.render(event);

await view.close(); // removes the live area and restores the interaction port
console.log("Done.");
```

Sin TTY, o con `plain: true`, es `createConsoleRenderer()` (líneas planas), con un `close()` que no hace nada.

## Opciones {#options}

| Opción | Descripción |
| --- | --- |
| `formatAction` | Etiquetas de las llamadas a herramientas. Consulta [Etiquetas de herramientas](tool-labels.md); `withToolLabels()` añade las de las extensiones ([Las etiquetas de una extensión](tool-labels.md#an-extensions-labels)). |
| `toolPhrase` | Cómo cuentan tus herramientas en un resumen plegado. |
| `toolDetail` | Cuánto se muestra de las llamadas a herramientas: `"full"` (por defecto), `"calls"` o `"summary"`. Consulta [Etiquetas de herramientas](tool-labels.md#how-much-shows). |
| `formatResult` | Tu propia línea de resultado por herramienta, o ninguna. Consulta [Etiquetas de herramientas](tool-labels.md#results-for-your-tools). |
| `agentLabel` | La etiqueta antes de la respuesta en la salida plana. |
| `onWrite` | Se llama con todo lo que escribe el renderizador de consola (texto plano), p. ej. para replicarlo en un fichero de log. |
| `renderApproval` | Tu propia vista previa en los paneles de aprobación. |
| `mode` | Se muestra en la barra de estado. |
| `theme`, `language` | Consulta [Temas](themes.md) e [Idiomas](../sessions/languages.md). |
| `plain` | Salida de consola plana incluso en un TTY. |

## La vista es un renderizador {#the-view-is-a-renderer}

`ProgressView` tiene los mismos métodos que el renderizador de consola, así que el código que imprime eventos funciona con cualquiera de los dos:

| Método | Qué hace |
| --- | --- |
| `render(event)` | Dibuja un `AgentEvent`. |
| `write(text)`, `writeLine(text)` | Escribe tu propio texto encima del área en vivo, y en `onWrite`. `writeLine` escribe una línea propia; la vista dibuja líneas completas, así que el texto de `write` aparece cuando su línea termina (un `\n` en él, un `writeLine()`, `endLine()` o el siguiente evento). |
| `endLine()` | Termina la línea actual si hace falta. |
| `startTurn()` | Marca un turno nuevo (la vista empieza uno al crearse). |
| `close()` | Termina la vista. Espérala con `await` antes de imprimir nada más. |

Ctrl+C durante un punto de control responde Stop y lanza `SIGINT`, de modo que tu propio manejador puede detener la ejecución y avisar a la persona con `writeLine()`:

```ts
let interrupting = false;
process.on("SIGINT", () => {
  if (interrupting) process.exit(130);
  interrupting = true;
  view.writeLine("Interrupting… (Ctrl+C again to exit without waiting)");
  void run.interrupt();
});
```

## El renderizador de consola plano {#the-plain-console-renderer}

`createConsoleRenderer()` imprime los eventos como líneas planas: el texto del agente según llega en streaming, `[action] <label>` por cada llamada a herramienta, los avisos y los errores. Lo usa `runChatTui()`, y también el log de la sesión.

```ts
import { createConsoleRenderer, runQuery } from "@falkenslab/agent-kit";

const renderer = createConsoleRenderer({ agentLabel: "Scout>", onWrite: (text) => log.write(text) });
const run = runQuery("Summarize the notes", options);
for await (const event of run.events) renderer.render(event);
renderer.endLine();
```

`output` cambia adónde va el texto (la salida estándar por defecto). No se imprimen las acciones de los subagentes, los resultados de las herramientas ni las sugerencias de prompt.
