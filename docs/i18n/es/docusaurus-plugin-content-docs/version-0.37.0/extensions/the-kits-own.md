---
sidebar_position: 2
title: Las propias del kit
description: Activar las extensiones internas del kit (awareness, sources, knowledge, memory) con sus factorías y opciones, y escribir una extensión en el propio código de tu agente.
---

# Las propias del kit, y las de tu agente

Las extensiones internas son código: las cuatro del kit, creadas por sus factorías, y las que tu agente escriba como un objeto. Ambas son `Extension`s, listadas en el spec.

## Activar las del kit {#enabling-the-kits}

```ts
import { awareness, knowledge, memory, sources, type AgentSpec } from "@falkenslab/agent-kit";

const spec: AgentSpec<Config> = {
  // …
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }),
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
    memory({ dir: path.join(os.homedir(), ".my-agent", "memory") }),
    diceExtension,
  ],
};
```

- Las del kit se crean con sus **factorías**, cada una con sus propias opciones; la propia de un agente es **un objeto** (consulta [más abajo](#writing-one-in-your-agents-code)).
- Una **opción de carpeta** (`dir`, un `FolderOption`) es una ruta, o una función de la configuración de la sesión que devuelve una (o `undefined`): el spec es estático, mientras que las carpetas suelen depender del proyecto. Las factorías son genéricas sobre el tipo de configuración: `knowledge<Config>({ dir: (config) => config.courseDir })`.
- **Ninguna está activa por defecto**, y solo la lista del spec activa una: una carpeta pertenece a la extensión que la nombra.
- Una extensión a la que a la sesión le falta algo (su carpeta: "needs a folder (`dir`)") **se queda fuera**, igual que una cuyas capacidades requeridas no proporciona nada activado (consulta [Capacidades](overview.md#capabilities)). El prompt del sistema dice cuáles están desactivadas y por qué, para que el agente pueda contárselo a la persona.

| Extensión | Opciones | Qué aporta |
| --- | --- | --- |
| `awareness` | `awareness({ guide? })`: `guide`, la ruta absoluta de una guía en markdown del dominio del agente. Necesita `identity` en el spec. | [Awareness](../capabilities/awareness.md): la sección del prompt "Who you are", `about_me` (lo que el agente es ahora mismo, leído de la sesión en cada llamada, y su `guide`) y la skill `help` (cómo se usa el chat del kit). Proporciona `self-awareness`. |
| `sources` | `sources({ dir, saveDescription? })`: `dir`, la carpeta de los originales; `saveDescription`, la descripción de la herramienta `save_to_sources` en palabras del agente. | Los originales: las herramientas de fuentes (`list_sources`, `extract_text`, `save_to_sources`, `download_to_sources`, y `request_file`, `retire_source` fuera del modo autónomo), `Read`/`Glob`/`Grep` sobre la carpeta, sin escribir nunca en ella, y su sección del prompt. Consulta [Fuentes](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained). Proporciona `sources`. |
| `knowledge` | `knowledge({ dir, pageTypes?, store? })`: `dir`, la carpeta de la base de conocimiento; `pageTypes`, [tus propios tipos de página](../capabilities/knowledge-base.md#your-own-page-types); `store(config, dir)`, [otro almacén](../capabilities/knowledge-store.md). | La [base de conocimiento](../capabilities/knowledge-base.md): las herramientas `knowledge_*` sobre un almacén, su sección del prompt con las preferencias de la persona, sus skills y comandos; las herramientas de ficheros nunca llegan a la carpeta. Proporciona `knowledge-base`. |
| `memory` | `memory({ dir })`: `dir`, una carpeta propia del agente fuera de cualquier proyecto. | La [memoria de la persona](../capabilities/memory.md), a través de todos sus proyectos: sus herramientas (`recall`, `remember`, `forget`), su sección del prompt con lo que recuerda, `/memory:list` y `/memory:forget`; solo se guarda a partir de lo que escribió la persona. Proporciona `person-memory`. |

Cada una es dueña de sus datos y nunca llama a las demás: el modelo las conecta a través de sus herramientas (consulta [Base de conocimiento y fuentes](../capabilities/knowledge-base.md#knowledge-base-and-sources)).

## Escribir una en el código de tu agente {#writing-one-in-your-agents-code}

Una extensión que solo necesita un agente, o que necesita las piezas internas del kit (un panel, un almacén pasado desde código, sus propias carpetas para las herramientas de ficheros, hooks), es código en el agente: una carpeta de plugin en su proyecto más un objeto que implementa `Extension`. Una que podría usar cualquier agente es mejor que sea [instalable](writing.md).

```ts
import path from "node:path";
import { createSdkMcpServer, tool, type Extension } from "@falkenslab/agent-kit";
import { z } from "zod";

export const diceExtension: Extension = {
  name: "dice", // the same as its plugin's
  plugin: path.join(__dirname, "extensions", "dice"), // .claude-plugin/plugin.json, skills…
  // missing: ({ config }) => (config.diceDir ? undefined : "needs `diceDir` in the config"),
  async contribute({ config, spec, runDir, mode, interactive }) {
    const roll = tool("roll", "Rolls a die.", { sides: z.number() }, async ({ sides }) => ({
      content: [{ type: "text" as const, text: String(1 + Math.floor(Math.random() * sides)) }],
    }), { annotations: { readOnlyHint: true } });
    return {
      mcpServers: { dice: createSdkMcpServer({ name: "dice", version: "1.0.0", tools: [roll] }) },
      promptSection: "## Dice\nWhen the person wants a roll, `roll` it: never make one up.",
      readOnlyTools: ["mcp__dice__roll"], // plan mode lets it through
      toolLabels: { mcp__dice__roll: { label: (input) => `Rolling a ${String(input.sides)}-sided die`, phrase: ["rolled once", "rolled {n} times"] } },
      helpLines: ["Dice: `roll` rolls one."],
    };
  },
};
```

Lo que puede llevar una contribución (todas las partes son opcionales):

| Campo | Qué hace |
| --- | --- |
| `mcpServers` | Sus servidores MCP, por nombre: sus herramientas son `mcp__<name>__<tool>`. |
| `promptSection` | Una sección del prompt del sistema, después de la lista de Extensions. Mantenla corta: para qué sirve y sus reglas. Los procedimientos van en skills. |
| `fileTools` | Herramientas de ficheros integradas que la sesión debe tener (`Read`, `Glob`, `Grep`…). |
| `readOnlyDirs` | Carpetas que las herramientas de ficheros pueden leer y buscar, nunca escribir. |
| `toolOnlyDirs` | Carpetas a las que solo se llega con sus propias herramientas, nunca con las de ficheros, con qué usar en su lugar (la denegación lo dice). |
| `readOnlyTools` | Sus herramientas que solo leen: el [modo plan](../core-concepts/modes.md#plan) las deja pasar; cualquier otra herramienta MCP se deniega ahí. |
| `readOnlyHintServers` | Sus servidores MCP cuyas herramientas deja pasar el modo plan cuando el servidor las marca con `readOnlyHint: true`, consultado mientras la sesión se ejecuta. Una extensión instalada sin `readOnlyTools` en su manifiesto lo establece; una en tu código suele listar `readOnlyTools` en su lugar. |
| `selfAskingTools` | Sus herramientas que preguntan ellas mismas a la persona (un panel): el modo interactivo no pregunta antes de usarlas. |
| `toolLabels` | Cómo muestra el chat sus herramientas, por nombre completo: la línea de cada una y cómo cuenta en un resumen plegado, en el idioma del kit. Consulta [Las etiquetas de una extensión](../terminal-ui/tool-labels.md#an-extensions-labels). |
| `hooks` | Sus hooks del SDK, por evento, que se ejecutan después de los propios del kit (la memoria escucha los mensajes de la persona con `UserPromptSubmit`). |
| `helpLines` | Lo que dice de sí misma en esta sesión (sus comandos, su carpeta), que el `about_me` de la extensión [awareness](../capabilities/awareness.md) le da al agente. |
| `api` | Lo que la extensión entrega al host: `buildSessionOptions()` devuelve el de cada extensión activa en `apis`, por nombre, y el `api(name)` del controlador del chat lo da (el `addSource` de la extensión `sources` en `apis.sources.addSource`, el almacén de la base de conocimiento en `apis.knowledge.knowledgeStore`). |

`missing(context)` dice por qué la extensión no puede ejecutarse en esta sesión (una carpeta que necesita), o `undefined`. El contexto tiene la configuración, el spec, la carpeta de la ejecución, el modo, si se le puede preguntar a una persona, y `capabilities`: lo que proporcionan las extensiones activas de la sesión (los `provides` de sus manifiestos), para una extensión que funciona de otra forma junto a otra. Se conoce una vez resueltas las extensiones, así que está vacío en `missing()` y lleno en `contribute()`: la base de conocimiento explica cómo relacionar sus resúmenes con los originales cuando `capabilities.has("sources")`.

Su plugin se carga como cualquiera de los del agente, así que sus skills, comandos y subagentes llevan su nombre (`dice:…`); con `skills: "plugins"` sus skills se ofrecen sin nombrarlas, y sus subagentes (`agents/*.md`) se registran como los propios del agente (consulta [Subagentes en un plugin](../capabilities/subagents.md#subagents-in-a-plugin)). Su manifiesto lleva sus capacidades en `metadata["agent-kit"]` (`provides`, `requires`), igual que el de una instalada ([Referencia del manifiesto](reference.md#metadataagent-kit)).
