---
sidebar_position: 3
title: Subagentes
description: Delega en subagentes especialistas de forma segura - cómo declararlos, sus herramientas y modelos, y las puertas que los mantienen a raya.
---

# Subagentes

Un subagente es un agente aparte en el que el principal delega una tarea con la herramienta `Agent`: su propio prompt, sus propias herramientas, a menudo un modelo más pequeño, y su propio contexto. El agente principal solo recibe su respuesta final. Úsalos para mantener el trabajo ruidoso (búsquedas web, lecturas largas) fuera del contexto principal, para usar un modelo más barato en trabajos sencillos, o para darle una capacidad acotada a un agente acotado.

## Declarar subagentes {#declaring-subagents}

```ts
import type { AgentDefinition } from "@falkenslab/agent-kit";

const SUBAGENTS: Record<string, AgentDefinition> = {
  "joke-finder": {
    description: "Searches the web for short jokes about pirates, cats or sailors and returns candidates with their source.",
    prompt: `Find on the web 2 or 3 short, clean jokes (about pirates, cats or sailors).
Use WebSearch (3 searches at most) and WebFetch only to open a page.
Return only a numbered list with each joke and the URL it comes from.`,
    tools: ["WebSearch", "WebFetch"],
    model: "haiku",
    maxTurns: 8,
  },
  "joke-critic": {
    description: "Scores a joke from 1 to 10 and suggests how to improve it. Uses no tools.",
    prompt: "Score the joke you're given from 1 to 10 with one sentence of justification and, below 8, one improvement.",
    tools: [],
    model: "haiku",
    maxTurns: 1,
  },
};

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => `You tell jokes.

Your crew (subagents, launch them with the Agent tool):
- joke-finder: for a new or fresh joke, send it to find candidates on the web.
- joke-critic: before telling a joke the finder brought, pass it the best one; below 6, ask for another batch once.`,
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => ({ agents: SUBAGENTS, allowedSubagentTypes: Object.keys(SUBAGENTS) }),
};
```

`AgentDefinition` es el tipo del SDK (que el kit reexporta). Sus campos más usados:

| Campo | Para qué sirve |
| --- | --- |
| `description` | Cuándo debe usarlo el agente principal. El agente principal la lee en la descripción de la herramienta `Agent`. |
| `prompt` | El prompt del sistema del subagente. No ve el prompt ni la conversación del agente principal, solo la tarea que este le escribe. |
| `tools` | Las herramientas que puede usar. Cada una debe estar también entre las herramientas de la sesión (ver abajo). |
| `model` | `"haiku"`, `"sonnet"`, `"opus"`, un id de modelo completo, o `"inherit"`. |
| `maxTurns` | Un límite de turnos. |
| `mcpServers` | Servidores MCP que solo ve este subagente. |
| `skills` | Skills precargadas en su contexto. |

Háblale al agente principal de su tripulación en el prompt del sistema: cuándo usar cada uno y qué hacer con la respuesta. Las descripciones por sí solas a menudo no bastan para un flujo de trabajo consistente.

El kit también añade la línea del [idioma de respuesta](../sessions/languages.md) al prompt de cada subagente.

## Qué cambia al devolver subagentes {#what-returning-subagents-changes}

Cuando `buildSubagents()` devuelve algo (no `undefined`):

1. La sesión recibe la herramienta `Agent`, para delegar (también cuando solo un [plugin trae subagentes](#subagents-in-a-plugin)), y `Bash` cuando un subagente puede usarla: uno que la incluye en sus `tools`, o uno sin `tools` (hereda todas las herramientas de la sesión). Si no, `Bash` se deja fuera, lo que ahorra unos 1,9k tokens de entrada en cada llamada.
2. `agents` se fija con tus definiciones.
3. Se registran tres hooks `PreToolUse`, las [puertas (gates) de los subagentes](../security/subagent-gates.md):
   - **puerta de tipo**: `Agent` solo puede lanzar los tipos de `allowedSubagentTypes`;
   - **puerta de Bash**: `Bash` se le deniega al agente principal;
   - **puerta de primer plano**: todo subagente permitido se ejecuta en primer plano (`run_in_background: false`).

Devuelve `undefined` para una configuración que no necesita subagentes, y así no se concede ninguna de las dos herramientas.

```ts
buildSubagents: (config) => (config.withResearch ? { agents: { researcher }, allowedSubagentTypes: ["researcher"] } : undefined),
```

## Subagentes en un plugin {#subagents-in-a-plugin}

Un plugin también puede traer subagentes, como ficheros markdown en su carpeta `agents/`: tus propios plugins (`pluginRoots`) y los de tus [extensiones](../extensions/overview.md). El frontmatter da el nombre, la descripción, las herramientas, el modelo y los turnos del subagente; el cuerpo es su prompt:

```markdown
---
name: loro-critico
description: Grumpy parrot who scores a joke from 1 to 10 and suggests how to improve it. Uses no tools.
tools: []
model: haiku
maxTurns: 1
---

You are Perico, the captain's grumpy parrot. You're given a joke: score it from 1 to 10…
```

El SDK lo nombra según el plugin y el `name` de su frontmatter (no su fichero): `jokebook:loro-critico`. El kit lo registra como uno de `buildSubagents()`: en `agents` con la línea del idioma de respuesta añadida, con permiso para que lo lance la puerta de tipo, y contado en la decisión sobre `Agent` y `Bash` (unas `tools` que incluyan `Bash`, o la ausencia de `tools`, traen `Bash`). Es la forma en que una extensión distribuye sus subagentes. Su prompt es texto fijo: uno que necesite la configuración del agente (su nombre en el idioma elegido, una carpeta) se queda en `buildSubagents()`.

## Herramientas de un subagente {#tools-of-a-subagent}

Un subagente solo puede usar herramientas que existan en la sesión. La sesión del kit tiene `WebFetch`, `WebSearch`, las herramientas de ficheros (con la extensión de fuentes, `extraWritableDirs` o `extraReadableDirs`), `Skill` (con plugins), `Bash` (cuando un subagente la incluye) y todas las herramientas MCP de `buildMcpServers()`.

- **Herramientas integradas**: enuméralas por su nombre: `tools: ["WebSearch", "WebFetch"]`. Un subagente con herramientas de ficheros queda sujeto al mismo [ámbito de ficheros](../security/file-scope.md) que el agente principal.
- **Herramientas MCP**: enuméralas por su nombre completo: las del kit, `tools: ["mcp__time__current_time"]`, o las tuyas, `tools: ["mcp__inventory__find_product"]`, registrando el servidor en `buildMcpServers()`.
- **Sin herramientas**: `tools: []` para un subagente que solo piensa.
- **Bash**: `tools: ["Bash"]`. Bash puede llegar a cualquier ruta y ejecutar cualquier cosa que pueda el usuario: que sea opcional y explícita, y prefiere una herramienta que haga exactamente lo que hace falta.

```ts
const stockClerk: AgentDefinition = {
  description: "Looks up products in the inventory and reports their stock.",
  prompt: "Find the products with find_product and answer with their name and stock, one per line.",
  tools: ["mcp__inventory__find_product"], // a server of yours, from buildMcpServers()
  model: "haiku",
  maxTurns: 3,
};

const clockBoy: AgentDefinition = {
  description: "Tells the date and time and works out how long until something.",
  prompt: "Read the time with current_time and work out dates with date_math. Answer in one line.",
  tools: ["mcp__time__current_time", "mcp__time__date_math"], // the kit's own
  model: "haiku",
  maxTurns: 3,
};
```

## Subagentes en el chat {#subagents-in-the-chat}

El chat de Ink muestra el trabajo de un subagente bajo la llamada a `Agent` que lo inició: sus llamadas a herramientas (las cinco últimas, atenuadas) y la primera línea de su respuesta cuando termina. El spinner muestra en una segunda línea lo que está haciendo el subagente (`↳ Searching the web for "…"`). En modo interactivo, las llamadas a herramientas del subagente también pasan por el panel de aprobación.

El registro de la sesión (`session.log`) y la consola solo recogen las acciones del agente principal.
