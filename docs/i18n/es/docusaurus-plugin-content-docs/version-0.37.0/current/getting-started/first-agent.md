---
sidebar_position: 3
title: Tu primer agente
description: Un tutorial paso a paso, desde un chat con un prompt del sistema hasta un agente con su propia herramienta, notas, supervisión y conversaciones que se pueden reanudar.
---

# Tu primer agente

Este tutorial construye un pequeño asistente de investigación, **Scout**, paso a paso. Cada paso es un `agent.ts` completo que puedes ejecutar con `npx tsx agent.ts`; cada uno añade una capacidad del kit.

Antes de empezar, prepara un proyecto como en [Instalación](installation.md) y asegúrate de que el agente puede llegar a Claude (una sesión con tu cuenta de Claude, o `ANTHROPIC_API_KEY`: consulta [Autenticación](authentication.md)).

## Paso 1: un chat con un prompt del sistema {#step-1-a-chat-with-a-system-prompt}

```ts title="agent.ts"
import path from "node:path";
import {
  buildSessionOptions,
  ensureClaudeAuth,
  runChatInk,
  type AgentSpec,
  type BaseSessionConfig,
} from "@falkenslab/agent-kit";

// 1. Who the agent is. Only buildSystemPrompt says something here; the rest is "nothing".
const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You are Scout, a concise research assistant. Answer in short paragraphs.",
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};

// 2. Claude: offers to sign in with the Claude account if the agent can't reach it.
await ensureClaudeAuth();

// 3. How it runs: the oversight mode and the folder it works in.
const config: BaseSessionConfig = { mode: "autonomous", projectDir: process.cwd() };

// 4. The chat. With a session opener and runsDir, every run gets its own folder under .run/.
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: { title: "Scout" },
  welcomeMessage: "Ask me anything. /exit to leave.",
});
```

Ejecútalo y tendrás un chat completo: respuestas en streaming con markdown, `/exit` o Ctrl+C para salir, ↑/↓ y Ctrl+R para el historial, `?` para los atajos.

Qué ha pasado:

- `buildSessionOptions()` ha construido las `Options` del SDK: el prompt del sistema (más una línea sobre el [idioma de respuesta](../sessions/languages.md)), las herramientas que recibe esta configuración (aquí solo `WebFetch` y `WebSearch`), los hooks de seguridad y los ajustes que el kit define siempre.
- `runChatInk()` ha llamado a tu abridor con una carpeta de ejecución nueva (`.run/2026-09-29T10-15-00-000Z/`), ha arrancado la sesión y ha dibujado el chat. Todo lo que ha mostrado el terminal va al `session.log` de esa carpeta; la conversación, a `conversation.jsonl`.

:::tip Añade `.run/` a `.gitignore`
Las carpetas de ejecución guardan conversaciones enteras y resultados de herramientas, sin ocultar nada. No las subas nunca al repositorio.
:::

## Paso 2: pantalla completa, modo guiado {#step-2-full-screen-guided-mode}

```ts
const config: BaseSessionConfig = { mode: "guided", projectDir: process.cwd() };

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: { title: "Scout", fields: { mode: config.mode } },
  mode: config.mode,
  fullscreen: true,
  welcomeMessage: "Ask me anything. /exit to leave.",
});
```

- `fullscreen: true` ocupa todo el terminal: el historial se desplaza en su propia vista (RePág/AvPág, la rueda del ratón), el prompt se queda abajo, arrastrar selecciona texto y un clic derecho lo copia.
- En modo `guided` el agente recibe una herramienta `request_human_approval` y debe llamarla antes de cualquier cosa visible para otros o difícil de deshacer; en el chat aparece un panel de aprobación. **Shift+Tab** cambia a `interactive`, donde cada llamada a herramienta pregunta primero, y después a `plan`, donde el agente solo lee y planifica. Consulta [Modos](../core-concepts/modes.md).

## Paso 3: una herramienta propia {#step-3-a-tool-of-its-own}

Cada sesión ya tiene unas cuantas herramientas del kit, como `current_time` y `date_math` para las fechas (consulta [Las herramientas propias del kit](../capabilities/tools-and-mcp.md#the-kits-own-tools)). Las tuyas son servidores MCP. Lo más sencillo es un servidor en proceso construido con `tool()` y `createSdkMcpServer()`, devuelto desde `buildMcpServers()`:

```ts
import { createSdkMcpServer, tool } from "@falkenslab/agent-kit";
import { z } from "zod";

// Metres per unit.
const LENGTHS: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 };

const units = createSdkMcpServer({
  name: "units",
  version: "1.0.0",
  tools: [
    tool(
      "convert_length",
      "Convert a length between units (mm, cm, m, km, in, ft, mi). Use it instead of converting yourself.",
      {
        value: z.number().describe("The length to convert"),
        from: z.enum(["mm", "cm", "m", "km", "in", "ft", "mi"]),
        to: z.enum(["mm", "cm", "m", "km", "in", "ft", "mi"]),
      },
      async ({ value, from, to }) => {
        const result = (value * LENGTHS[from]) / LENGTHS[to];
        return { content: [{ type: "text" as const, text: `${value} ${from} = ${Number(result.toPrecision(10))} ${to}` }] };
      },
      { annotations: { readOnlyHint: true } },
    ),
  ],
});

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You are Scout, a concise research assistant. Use the tools for dates and unit conversions.",
  buildMcpServers: () => ({ units }),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};
```

Los esquemas de las herramientas usan [zod](https://zod.dev) (`npm install zod`); una herramienta sin parámetros recibe `{}`. El kit aprueba automáticamente cada herramienta `mcp__*`, así que el agente puede llamar a `mcp__units__convert_length` desde el primer momento. Consulta [Herramientas y servidores MCP](../capabilities/tools-and-mcp.md).

## Paso 4: notas que sobreviven a la sesión {#step-4-notes-that-survive-the-session}

Activa las [extensiones](../extensions/overview.md) `knowledge` y `sources` del kit, cada una con su carpeta: el agente recibe la [base de conocimiento](../capabilities/knowledge-base.md), sus propias herramientas, reglas y skills para llevar sus notas como una wiki enlazada, y una carpeta de originales.

```ts
import { knowledge, sources } from "@falkenslab/agent-kit";

const spec: AgentSpec<BaseSessionConfig> = {
  // …the same as before, plus:
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }), // originals: readable, never modified
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }), // the agent's notes, through the knowledge_* tools
  ],
};
```

Una carpeta es una ruta o, como aquí, una función de la configuración de la sesión: la spec sigue siendo la misma aunque cambie `projectDir`.

Ahora Scout lleva sus notas con las herramientas `knowledge_*` (buscar, leer, crear, editar, registrar…) y lee los originales de `sources/` con `Read`, pero nunca los modifica (añade ficheros ahí con las herramientas de las fuentes, que nunca sobrescriben, y `list_sources` junto con `knowledge_index` le dice qué no se ha ingerido todavía). Prueba `/knowledge:ingest` después de dejar un PDF en `sources/`.

## Paso 5: reanudar una conversación {#step-5-resume-a-conversation}

Ya está ahí desde el paso 1: arranca con `npx tsx agent.ts --continue` para retomar la última conversación, o escribe `/resume` en el chat para elegir una. Consulta [Ejecuciones y reanudación](../sessions/runs-and-resuming.md).

## Paso 6: hazlo tuyo {#step-6-make-it-yours}

```ts
import { ui } from "@falkenslab/agent-kit";

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: {
    title: "Scout",
    fields: { mode: config.mode },
    art: [ui.accent(" ▄▀▀▄ "), ui.accent(" █  █ "), ui.accent("  ▀▀  ")],
  },
  mode: config.mode,
  fullscreen: true,
  promptLabel: `${ui.user("you>")} `,
  agentLabel: ui.agent("Scout>"),
  firstPromptSuggestion: "what's new in TypeScript this year?",
  historyPath: path.resolve(".run/history.jsonl"),
  theme: { accent: "#56b6c2", selection: "#56b6c2" },
});
```

- `header.art`: un pequeño logotipo a la izquierda del título, una cadena por fila, solo con caracteres de una columna.
- `promptLabel` y `agentLabel`: las etiquetas del chat sencillo y del registro de la sesión.
- `firstPromptSuggestion`: la sugerencia que se muestra (y que se acepta con Tab) antes del primer turno.
- `historyPath`: el historial de ↑/↓, que se conserva entre ejecuciones.
- `theme`: solo los colores que quieras cambiar. Consulta [Temas](../terminal-ui/themes.md).

## Adónde ir después {#where-to-go-next}

- La forma completa de una spec: [AgentSpec](../core-concepts/agent-spec.md).
- Delegar en especialistas: [Subagentes](../capabilities/subagents.md).
- Ejecutar sin chat (un trabajo, un script): [Ejecuciones de una sola vez](../advanced/one-shot-runs.md).
- Manejar el agente desde una aplicación de escritorio: [Hosts a medida](../advanced/custom-hosts.md).
- Un agente completo para leer: [Captain Whiskers](../examples/captain-whiskers.md).
