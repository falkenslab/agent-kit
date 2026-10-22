---
sidebar_position: 5
title: Transcripción y logs
description: Lo que el kit escribe en disco en cada ejecución, y cómo se mantienen los secretos fuera.
---

# Transcripción y logs

Cada ejecución deja un rastro en su carpeta:

| Fichero | Lo escribe | Contenido | Secretos ocultos |
| --- | --- | --- | --- |
| `transcript.jsonl` | el hook que registra la transcripción | cada llamada a una herramienta y su resultado, como líneas JSON | sí |
| `session.log` | el chat | lo que mostró el terminal, como texto plano | no |
| `conversation.jsonl`, `subagents/*.jsonl` | el [almacén de ejecuciones](../sessions/runs-and-resuming.md) | la transcripción completa del SDK | no |

## `transcript.jsonl` {#transcriptjsonl}

Un hook `PreToolUse` y otro `PostToolUse` añaden una línea por evento:

```json
{"ts":"2026-09-29T10:15:02.114Z","event":"pre_tool_use","tool":"WebFetch","input":{"url":"https://example.com","prompt":"Summarize"}}
{"ts":"2026-09-29T10:15:04.870Z","event":"post_tool_use","tool":"WebFetch","result":"Example Domain. This domain is for use in illustrative examples…"}
```

- Las respuestas del modo guiado sobre las herramientas de una extensión instalada también van ahí, una línea cada una: `{"ts":"…","event":"guided_decision","extension":"canva","tool":"mcp__canva__create-design","answer":"session"}`. La respuesta es `yes`, `session`, `always`, `no` o `never` (las de la persona), `kept-never` (denegada por una respuesta guardada antes), `autonomous-deny` (nadie a quien preguntar) o `server-asks` (se deja pasar: su servidor pregunta él mismo a la persona).
- El fichero se crea en la primera llamada a una herramienta; una sesión sin llamadas a herramientas no lo tiene.
- Los resultados largos se cortan a los 2.000 caracteres, y las cargas en base64 (capturas de pantalla) se sustituyen por `[image omitted, N bytes base64]`, para que la transcripción de un agente de navegador siga siendo legible.
- En cada línea se ocultan los secretos antes de escribirla: cada valor de `config.secrets`, y siempre `CLAUDE_CODE_OAUTH_TOKEN`, se convierten en `***`.

```ts
const password = await readPasswordFromVault();

const config: Config = {
  mode: "guided",
  projectDir,
  password,
  secrets: [password, process.env.SHOP_API_KEY!],
};
```

La ocultación sustituye valores exactos. Un secreto que el modelo reformatea (lo divide, lo codifica, lo entrecomilla de otra forma) no coincidirá; mantén los secretos fuera del alcance del agente con `deniedPaths` y no poniéndolos en los prompts.

`createTranscriptLogger(path, secrets)` y `summarizeToolResponse()` se exportan para las sesiones montadas a mano.

## `session.log` {#sessionlog}

Los chats reflejan lo que muestra el terminal en el `session.log` de la ejecución: el mensaje de bienvenida, cada línea escrita, las respuestas del agente, líneas `[action]` para las llamadas a herramientas, avisos y errores, sin colores. Es la forma más fácil de leer qué pasó en una ejecución. No oculta los secretos: contiene todo lo que se escribió y se respondió.

## La transcripción del SDK {#the-sdks-transcript}

Con una carpeta de ejecuciones, la transcripción propia del SDK (cada mensaje, entrada y resultado de herramienta, completos) se guarda en la carpeta de la ejecución para poder reanudar la conversación. La CLI también guarda su copia en `~/.claude/projects/`. Ninguna de las dos está censurada.

:::warning
Trata las carpetas de las ejecuciones como sensibles: mantenlas fuera del control de versiones y de las copias de seguridad que compartas.
:::
