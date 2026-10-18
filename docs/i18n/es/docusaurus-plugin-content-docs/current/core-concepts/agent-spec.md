---
sidebar_position: 2
title: AgentSpec
description: El contrato que implementa un agente, miembro a miembro, con ejemplos.
---

# AgentSpec

`AgentSpec<TConfig>` es todo lo relativo al dominio de un agente que el kit necesita pero no decide: su prompt del sistema, los servidores MCP que siempre tiene, las carpetas con sus skills y comandos, y sus subagentes, además de unos pocos ajustes opcionales. `TConfig` es tu tipo de configuración (cualquier tipo que amplíe [`BaseSessionConfig`](session-config.md)); cada método recibe la configuración completa, así que puede depender de tus propios campos.

```ts
import type { AgentSpec, BaseSessionConfig } from "@falkenslab/agent-kit";

interface Config extends BaseSessionConfig {
  courseUrl: string;
  teacherName: string;
}

const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => `You help ${config.teacherName} with the course at ${config.courseUrl}.`,
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};
```

:::info ¿Por qué no `AgentDefinition`?
El SDK ya usa `AgentDefinition` para la definición de un único subagente. `AgentSpec` está un nivel por encima: decide, entre otras cosas, qué subagentes se registran.
:::

## Miembros obligatorios {#required-members}

### `buildSystemPrompt(config): string` {#buildsystempromptconfig-string}

El prompt del sistema de esta sesión. Todo lo específico del rol, del modo o del dominio va aquí. El kit le añade al final:

- con [extensiones](../extensions/overview.md) activadas, una sección Extensions y la propia de cada una (la de la [base de conocimiento](../capabilities/knowledge-base.md), la de las fuentes);
- una línea que pide responder en el [idioma del kit](../sessions/languages.md), salvo que `replyInLanguage` sea `false`.

Los prompts largos son más fáciles de mantener como ficheros: consulta [Prompts](../capabilities/prompts.md) y `createPromptLoader()`.

```ts
buildSystemPrompt: (config) =>
  loadPrompt(config.mode === "autonomous" ? "system-autonomous.md" : "system.md", { course: config.courseUrl }),
```

### `buildMcpServers(config, runDir): Record<string, McpServerConfig>` {#buildmcpserversconfig-rundir-recordstring-mcpserverconfig}

Los servidores MCP que este agente registra siempre, indexados por el nombre del servidor. El kit añade los suyos junto a ellos cuando corresponde (aprobaciones, intervención manual, las herramientas de las fuentes, fecha y hora), así que no registres esos. `runDir` es la carpeta de esta ejecución, útil para un servidor que escribe ficheros (un navegador que descarga en ella, por ejemplo).

```ts
buildMcpServers: (config, runDir) => ({
  inventory, // an in-process server built with createSdkMcpServer()
  playwright: {
    command: "npx",
    args: ["@playwright/mcp@latest", "--output-dir", runDir],
  },
}),
```

Cada llamada `mcp__<server>__<tool>` se aprueba automáticamente (consulta [Permisos](../security/permissions-and-isolation.md)); bloquea las que no quieras con `disallowedTools`. Más en [Herramientas y servidores MCP](../capabilities/tools-and-mcp.md).

### `pluginRoots(config): string[]` {#pluginrootsconfig-string}

Rutas absolutas de los plugins locales (carpetas con `.claude-plugin/plugin.json`, `skills/` y `commands/`) que se cargan, en orden. Devuelve `[]` si no hay ninguno. Consulta [Skills y plugins](../capabilities/skills-and-plugins.md).

```ts
pluginRoots: () => [path.join(__dirname, "plugin")],
```

### `buildSubagents(config)` {#buildsubagentsconfig}

Los subagentes que registra esta configuración, y cuáles de ellos puede lanzar la herramienta `Agent`, o `undefined` si no hay ninguno:

```ts
buildSubagents: () => ({
  agents: {
    "joke-finder": {
      description: "Searches the web for short jokes and returns candidates with their source.",
      prompt: "Find 2 or 3 short, clean jokes on the web. Return a numbered list with each joke and its URL.",
      tools: ["WebSearch", "WebFetch"],
      model: "haiku",
      maxTurns: 8,
    },
  },
  allowedSubagentTypes: ["joke-finder"],
}),
```

Devolver algo aquí también le da a la sesión la herramienta `Agent`, y `Bash` cuando un subagente la incluye o no tiene `tools` (Bash solo para los subagentes), y registra las tres [puertas (gates) de los subagentes](../security/subagent-gates.md). Devuelve `undefined` cuando esta configuración no necesita subagentes, para que no se conceda ninguna de las dos herramientas. Consulta [Subagentes](../capabilities/subagents.md).

## Miembros opcionales {#optional-members}

| Miembro | Por defecto | Qué hace |
| --- | --- | --- |
| `identity?: AgentIdentity` | ninguno | Quién es el agente (`name`, `version`, `description`): la extensión [awareness](../capabilities/awareness.md) se lo cuenta al modelo, junto con la versión de agent-kit. Consulta [`identity` y la guía](#identity-and-the-guide). |
| `disallowedTools?: string[]` | `[]` | Herramientas bloqueadas aunque cualquier otra cosa las permita, p. ej. una herramienta MCP de la que no te fías. Tiene prioridad sobre todo lo demás. Una herramienta integrada además sale del contexto; una herramienta MCP queda bloqueada, pero su definición se sigue enviando. |
| `extensions?: Extension[]` | ninguna | Con qué se ejecuta el agente además del núcleo, cada una con sus propias opciones: las del kit, creadas por sus factorías (`awareness()`, `sources({ dir })`, `knowledge({ dir })`, `memory({ dir })`), y las suyas, como objetos. Consulta [Extensiones](../extensions/overview.md). |
| `humanApprovalTexts?` | textos genéricos | `{ description, approved, rejected }` de la herramienta de aprobación (modo guiado). |
| `manualInterventionTexts?` | ninguno | Sus textos, y la activación opcional, de la herramienta de intervención manual. |
| `replyInLanguage?: boolean` | `true` | La línea que pide al agente (y a cada subagente) que responda en el idioma del kit. |
| `settingSources?: SettingSource[]` | `["project"]` | Qué ficheros de ajustes de Claude Code carga la sesión. |
| `skills?: string[] \| "all" \| "plugins"` | `"all"` | Qué skills ofrece el agente: todas las que encuentre, solo las de sus plugins (`"plugins"`) o una lista. |
| `planMode?: PlanModeSpec` | ninguno | En modo plan, los ficheros de plan del agente y sus herramientas MCP de solo lectura. |

### `identity` y la guía {#identity-and-the-guide}

Quién es el agente (su nombre, su versión y qué es), en la spec, y una guía de su propio dominio (sus comandos, su configuración, sus carpetas), la opción `guide` de la extensión [awareness](../capabilities/awareness.md). La extensión los usa: le dice al modelo quién es, junto con la versión de agent-kit, responde qué es en este momento con `about_me`, le da la guía cuando la persona pregunta y explica el chat del kit con su skill `help`. Necesita `identity`; sin la extensión, ninguno de los dos llega al modelo.

```ts
const spec: AgentSpec<Config> = {
  // …
  identity: { name: "padawan", version, description: "an agent that takes a Moodle course as a student" },
  extensions: [awareness({ guide: path.join(__dirname, "guide.md") })],
};
```

Solo `name` es obligatorio. Escribe la guía en inglés, pensando en las preguntas de la persona, y deja fuera el chat y lo que cambia durante una sesión: consulta [Awareness](../capabilities/awareness.md#turning-it-on).

### `disallowedTools` {#disallowedtools}

```ts
// A browser-driving agent: this Playwright tool runs arbitrary code, so it's never allowed.
disallowedTools: ["mcp__playwright__browser_run_code_unsafe"],
```

El SDK comprueba `disallowedTools` antes que nada: una herramienta no permitida nunca llega a la callback de permisos del kit, y mucho menos se ejecuta. También se pueden bloquear herramientas integradas (`disallowedTools: ["WebSearch"]` deja a un agente sin búsqueda web).

### `humanApprovalTexts` {#humanapprovaltexts}

La herramienta de aprobación existe fuera del modo autónomo. Su descripción le dice al modelo cuándo llamarla, así que escríbela para tu dominio:

```ts
humanApprovalTexts: {
  description:
    "Call this right before publishing anything students will see (a grade, a forum post, a page). " +
    "Not for browsing or reading.",
  approved: "Approved by the teacher. Go ahead.",
  rejected: "The teacher rejected it. Don't publish it; ask what to change.",
},
```

Consulta [Aprobaciones](../human-in-the-loop/approvals.md).

### `manualInterventionTexts` {#manualinterventiontexts}

Definirlo es lo que registra la herramienta `request_manual_login` (fuera del modo autónomo). Solo tiene sentido para un agente que maneja una interfaz en vivo en la que una persona puede intervenir, como una ventana de navegador:

```ts
manualInterventionTexts: {
  toolDescription: "Call this when you can't log in by yourself; a person will log in by hand in the browser window.",
  confirmedMessage: "The person says they logged in. Check the page and continue.",
  checkpointTitle: "Manual login needed",
  checkpointLines: ["Log in in the browser window the agent opened, then confirm here."],
},
```

Consulta [Intervención manual](../human-in-the-loop/manual-intervention.md).

### `settingSources` y `skills` {#settingsources-and-skills}

```ts
settingSources: [], // load no Claude Code settings or CLAUDE.md at all
skills: "plugins", // only the skills of the plugins it loads are listed to the model
```

Consulta [Permisos y aislamiento](../security/permissions-and-isolation.md) y [Contexto y coste](../sessions/context-and-cost.md).

## Una spec completa {#a-complete-spec}

```ts title="spec.ts"
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPromptLoader, createSdkMcpServer, tool, type AgentSpec, type BaseSessionConfig } from "@falkenslab/agent-kit";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const loadPrompt = createPromptLoader(path.join(here, "prompts"));

export interface Config extends BaseSessionConfig {
  audience: string;
}

const inventory = createSdkMcpServer({
  name: "inventory",
  version: "1.0.0",
  tools: [
    tool("find_product", "Find products in the inventory by name.", { query: z.string() }, async ({ query }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await db.products.search(query)) }],
    }), { annotations: { readOnlyHint: true } }),
  ],
});

export const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => loadPrompt("system.md", { audience: config.audience }),
  buildMcpServers: () => ({ inventory }),
  pluginRoots: () => [path.join(here, "plugin")],
  buildSubagents: () => ({
    agents: {
      researcher: {
        description: "Researches a question on the web and returns a short, sourced answer.",
        prompt: "Research the question with WebSearch and WebFetch. Answer in five lines at most, with sources.",
        tools: ["WebSearch", "WebFetch"],
        model: "haiku",
      },
    },
    allowedSubagentTypes: ["researcher"],
  }),
  disallowedTools: ["Write"],
  skills: ["my-agent:summaries"],
  settingSources: [],
};
```

### `planMode` {#planmode}

En [modo plan](modes.md#plan) el agente solo lee y planifica. Dos callbacks dicen qué más puede hacer ahí:

- `isPlanFile(filePath, config)`: si `Write`/`Edit` pueden tocar este fichero (ruta absoluta). Además debe poder escribirse dentro del [ámbito de ficheros](../security/file-scope.md).
- `isReadOnlyTool(toolName, input)`: si una de las herramientas MCP del agente solo lee. Cada herramienta MCP que no avale se deniega en modo plan.

```ts
planMode: { isReadOnlyTool: (toolName) => toolName === "mcp__inventory__find_product" },
```

Sin `planMode`, en modo plan el agente puede leer, buscar, preguntar a una persona y delegar, no escribe nada y presenta su plan en su respuesta.
