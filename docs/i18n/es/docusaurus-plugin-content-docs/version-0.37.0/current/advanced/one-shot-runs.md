---
sidebar_position: 2
title: Ejecuciones de una sola vez
description: Agentes que hacen una tarea y terminan - scripts, trabajos programados, CI - con o sin una persona mirando.
---

# Ejecuciones de una sola vez

No todo agente es un chat. Una ejecución de una sola vez recibe una tarea, trabaja en ella y termina: un trabajo nocturno que actualiza una base de conocimiento, un paso de CI que revisa un cambio, una herramienta de línea de comandos.

## La forma {#the-shape}

```ts title="update-notes.ts"
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  buildSessionOptions,
  createProgressView,
  ensureClaudeAuth,
  knowledge,
  runQuery,
  sources,
  type AgentSpec,
  type BaseSessionConfig,
} from "@falkenslab/agent-kit";

const workspace = path.resolve(process.argv[2] ?? ".");
const runDir = path.join(workspace, ".run", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(runDir, { recursive: true });

await ensureClaudeAuth();

const config: BaseSessionConfig = {
  mode: process.stdin.isTTY ? "guided" : "autonomous", // nobody to ask in a job
  projectDir: workspace,
};

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You maintain this workspace's knowledge base.",
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
  extensions: [
    sources({ dir: path.join(workspace, "sources") }),
    knowledge({ dir: path.join(workspace, "knowledge") }),
  ],
};

const { options } = await buildSessionOptions(config, runDir, spec);
const view = createProgressView({ mode: config.mode });

const run = runQuery("/knowledge:ingest", options);
let failed = false;
for await (const event of run.events) {
  view.render(event);
  if (event.type === "turn-end") failed = event.failed;
}
await view.close();

process.exitCode = failed ? 1 : 0;
```

- Un **prompt que es una cadena** hace que sea un solo turno: los eventos terminan con su `turn-end`. Un comando con barra (`/knowledge:ingest`) funciona como prompt.
- La **vista de progreso** lo muestra en directo en un terminal e imprime líneas sencillas en otro caso (logs de CI).
- Los **códigos de salida** salen de `turn-end.failed`.

## Desatendidas {#unattended}

- Usa el modo `autonomous` cuando nadie pueda responder, o mantén `guided` y responde a través del [fichero de respuesta](../human-in-the-loop/response-file.md) desde un supervisor.
- Sin TTY, los puntos de control nunca se bloquean esperando al teclado: esperan al fichero.
- Conserva las carpetas de las ejecuciones: `transcript.jsonl` cuenta lo que hizo el agente, herramienta a herramienta.

## Varios pasos {#several-steps}

Un trabajo de varios pasos es una sesión de varios turnos con un guion fijo:

```ts
const queue = createInputQueue();
const run = runQuery(queue.iterable, options);
const events = run.events[Symbol.asyncIterator]();

async function turn(line: string): Promise<boolean> {
  queue.push(line);
  view.startTurn();
  while (true) {
    const { value, done } = await events.next();
    if (done) return false;
    view.render(value);
    if (value.type === "turn-end") return !value.failed;
  }
}

for (const step of ["/knowledge:ingest", "/knowledge:lint", "Write a short report of what changed to knowledge/syntheses/nightly.md"]) {
  if (!(await turn(step))) break;
}
queue.end();
run.close();
await view.close();
```

## Salida estructurada {#structured-output}

Para usar el resultado en código, pide un formato y analiza la respuesta o, mejor aún, dale al agente una herramienta para entregar su resultado y léelo desde el manejador de tu herramienta:

```ts
let verdict: { ok: boolean; reasons: string[] } | null = null;

const results = createSdkMcpServer({
  name: "results",
  version: "1.0.0",
  tools: [
    tool(
      "submit_verdict",
      "Submit your final verdict. Call it exactly once, at the end.",
      { ok: z.boolean(), reasons: z.array(z.string()) },
      async (args) => {
        verdict = args;
        return { content: [{ type: "text" as const, text: "Verdict received." }] };
      },
    ),
  ],
});
```
