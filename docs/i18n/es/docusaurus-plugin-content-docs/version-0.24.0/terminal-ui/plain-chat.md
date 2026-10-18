---
sidebar_position: 2
title: Chat plano
description: runChatTui() - el chat de readline para terminales sin Ink, pipes y ejecuciones en segundo plano.
---

# Chat plano

`runChatTui()` es un chat sobre el `readline` de Node: la respuesta llega en streaming como líneas planas, las llamadas a herramientas son líneas `[action]` y los puntos de control se preguntan en el prompt. Acepta las mismas opciones que [`runChatInk()`](ink-chat.md) (las exclusivas de Ink se ignoran) y el mismo abridor de sesión.

```ts
function runChatTui(options: Options | SessionOpener, tuiOptions?: ChatTuiOptions): Promise<void>;
```

`runChatInk()` recurre a él por sí solo cuando no hay TTY o con `plain: true`, así que la mayoría de los agentes nunca lo llaman directamente. Úsalo cuando:

- el agente se ejecuta **detrás de un pipe** o en un job de CI: `echo "summarize" | npx tsx agent.ts`;
- la terminal no se lleva bien con Ink;
- quieres una salida fácil de capturar o copiar.

```ts
await runChatInk(opener, { runsDir, plain: process.env.MY_AGENT_PLAIN === "1" });
```

## Qué aspecto tiene {#what-it-looks-like}

```text
Scout is ready. /exit to leave.

you> what's new in TypeScript?
[action] Searching the web for "TypeScript release notes"
[action] Fetching https://devblogs.microsoft.com/typescript/…
Scout> TypeScript 6.0 shipped in March…

you>
```

- `agentLabel` se imprime antes de cada respuesta, y le da color.
- Esc interrumpe el turno; Ctrl+C lo interrumpe, o sale con el prompt inactivo.
- ↑/↓ recorren el historial (`historyPath`).
- Un `/command` desconocido se detecta antes de que llegue al modelo.
- La lista de tareas del agente (`TodoWrite`) imprime una línea cuando una tarea empieza (`[task] ◼ Preparing the slides`) y cuando termina (`[task] ☑ Prepare the slides`), no las llamadas; el log de la sesión de cualquier chat recibe las mismas líneas.
- `/resume` imprime una lista numerada de ejecuciones y pide un número.
- `/extensions` funciona como en el chat Ink: lista las extensiones, y `enable`/`disable` activa o desactiva una, en la misma sesión cuando puede.
- `/plan` cambia al [modo plan](../core-concepts/modes.md#plan) y vuelve, con la opción `modeControl` o un abridor de sesión (el chat plano no tiene Shift+Tab).

## Puntos de control {#checkpoints}

El chat registra su interfaz de `readline` con `setSharedReadline()`, de modo que un punto de control pregunta en el mismo editor de líneas en lugar de en un segundo que le disputaría el teclado:

```text
=== Human confirmation required before publishing ===
Summary: post the weekly summary
Allow this to continue? [Y/n/q]
```

Sin TTY, los puntos de control solo se responden mediante el [fichero de respuesta](../human-in-the-loop/response-file.md).

## Manejarlo desde otro programa {#driving-it-from-another-program}

Las líneas escritas en su entrada estándar se envían como mensajes, una por línea:

```bash
printf 'summarize the news\n/exit\n' | npx tsx agent.ts
```

Dale al chat un momento para arrancar antes de escribir: una línea que llega antes de que el prompt esté listo se descarta.
