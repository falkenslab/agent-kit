---
sidebar_position: 6
title: Fichero de respuesta
description: Responde a los puntos de control desde fuera del proceso escribiendo un fichero.
---

# Fichero de respuesta

Cualquier punto de control se puede responder escribiendo en `<runDir>/approval-response.txt`. Es la forma en que algo distinto de una persona al teclado maneja un agente: un script, un test, otro programa o Claude Code pilotando el agente.

## Cómo funciona {#how-it-works}

1. Cuando empieza un punto de control, el kit borra cualquier fichero de respuesta antiguo de la carpeta de la ejecución.
2. Comprueba el fichero una vez por segundo.
3. En cuanto el fichero tiene contenido no vacío, ese contenido (sin espacios alrededor y en minúsculas) es la respuesta; el fichero se borra y la pregunta del puerto se retira.

| Punto de control | Escribe | Significa |
| --- | --- | --- |
| Decisión | `y` o `yes` | Sí |
| Decisión | `n` | No |
| Decisión | `q` | Parar |
| Intervención manual | cualquier cosa | Hecho |

Un fichero vacío o en blanco no es una respuesta: el kit sigue esperando.

```bash
# The run folder is the newest folder under .run/ (or wherever your agent keeps runs).
echo y > .run/2026-09-29T10-15-00-000Z/approval-response.txt
```

## Sin TTY el fichero es el único canal {#without-a-tty-the-file-is-the-only-channel}

Cuando la entrada estándar no es un terminal (un proceso en segundo plano, un trabajo de CI, una tubería), el puerto del terminal no imprime nada y nunca responde: cada punto de control espera al fichero. Mientras tanto el agente sigue ejecutándose; nada caduca.

## Saber que un punto de control está esperando {#knowing-a-checkpoint-is-waiting}

La [transcripción](../security/transcript.md) de la ejecución (`<runDir>/transcript.jsonl`) recibe una línea `pre_tool_use` antes de cada llamada a una herramienta, antes de que se ejecute ninguna puerta, y una línea `post_tool_use` cuando la llamada termina. Así:

- una **aprobación** está esperando cuando la última línea es un `pre_tool_use` de `mcp__approvals__request_human_approval` (su `input.summary` dice para qué);
- una **intervención manual** está esperando tras un `pre_tool_use` de `mcp__manualLogin__request_manual_login`;
- en modo **interactivo**, la puerta de pasos está esperando en cada `pre_tool_use` que aún no tiene su `post_tool_use`.

Un supervisor que aprueba según una política propia:

```ts title="supervise.ts"
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface TranscriptLine {
  event: "pre_tool_use" | "post_tool_use";
  tool: string;
  input?: { summary?: string };
}

export async function supervise(runDir: string, decide: (summary: string) => "y" | "n"): Promise<never> {
  let answered = 0; // how many approvals we already answered
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const lines = (await readFile(path.join(runDir, "transcript.jsonl"), "utf8").catch(() => ""))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TranscriptLine);
    const approvals = lines.filter((l) => l.event === "pre_tool_use" && l.tool === "mcp__approvals__request_human_approval");
    if (approvals.length > answered) {
      const summary = approvals[answered].input?.summary ?? "";
      answered++;
      await writeFile(path.join(runDir, "approval-response.txt"), `${decide(summary)}\n`);
    }
  }
}

// supervise(runDir, (summary) => (/delete|remove/i.test(summary) ? "n" : "y"));
```

## Hosts sin terminal {#hosts-without-a-terminal}

Una aplicación de escritorio normalmente instala su propio [puerto de interacción](interaction-port.md) en su lugar; aun así puede usar el fichero (para una función de "aprobación remota", por ejemplo), o instalar `null` como puerto para responder solo a través del fichero.
