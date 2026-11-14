---
sidebar_position: 1
title: Herramientas y servidores MCP
description: Las herramientas que recibe un agente, cómo darle las suyas con servidores MCP en proceso o externos, y cómo bloquear herramientas.
---

# Herramientas y servidores MCP

## Las herramientas de una sesión {#the-tools-a-session-has}

`buildSessionOptions()` solo concede las herramientas integradas que necesita una configuración (consulta [Opciones de sesión](../core-concepts/session-options.md#tools)):

- **siempre**: `WebFetch`, `WebSearch` y `TodoWrite` (una lista de tareas para trabajos largos, que los chats muestran encima del prompt);
- **con carpetas**: `Read`, `Glob`, `Grep` para las fuentes (la extensión `sources`) y `extraReadableDirs`; también `Write` y `Edit` para `extraWritableDirs` (una carpeta de notas propias del agente, por ejemplo); todas dentro de su [ámbito de ficheros](../security/file-scope.md);
- **con herramientas de ficheros o plugins**: `Skill`;
- **con subagentes**: `Agent`, y `Bash` (solo para los subagentes) cuando alguno la incluye en su lista o no tiene `tools`.

Todo lo demás que hace un agente, lo hace mediante **herramientas MCP**: las propias del kit y las tuyas.

## Las herramientas propias del kit {#the-kits-own-tools}

Además de las integradas, el kit registra herramientas MCP propias, cada una cuando procede (consulta [Opciones de sesión](../core-concepts/session-options.md#mcp-servers-and-permissions)):

| Herramienta | Qué hace | Cuándo |
| --- | --- | --- |
| `current_time` | La fecha, la hora, el día de la semana, la zona horaria y la diferencia con UTC locales, y el instante en UTC | Siempre |
| `date_math` | Aritmética de fechas exacta: días, semanas y días laborables entre dos fechas; una fecha más o menos días, semanas, meses o días laborables | Siempre |
| `request_human_approval` | Pregunta a una persona antes de una acción difícil de deshacer. Consulta [Aprobaciones](../human-in-the-loop/approvals.md) | No en modo autónomo |
| `ask_human` | Pide a la persona que elija entre opciones, dentro del turno. Consulta [Elecciones y planes](../human-in-the-loop/choices-and-plans.md) | No en modo autónomo |
| `present_plan` | Muestra el plan; la persona lo ejecuta (saliendo del modo plan), sigue planificando o cancela | Solo en modo plan |
| `request_manual_login` | Espera a que una persona actúe a mano. Consulta [Intervención manual](../human-in-the-loop/manual-intervention.md) | Con `manualInterventionTexts`, no en modo autónomo |
| `knowledge_*` (10 herramientas) | La base de conocimiento, como páginas: índice, búsqueda, lectura, creación, edición, reescritura, sustitución, retirada, registro, comprobación. Consulta [Base de conocimiento](knowledge-base.md#the-tools) | La extensión `knowledge` |
| `list_sources`, `extract_text`, `save_to_sources`, `download_to_sources` | Lista los originales con su estado y cuándo cambió cada uno por última vez; lee uno DOCX, PPTX o XLSX; añade uno desde la carpeta de la ejecución o una URL, sin sobrescribir nunca. Consulta [Fuentes](knowledge-base.md#sources-originals-kept-as-obtained) | La extensión `sources` |
| `request_file`, `retire_source` | Pide un fichero a la persona; retira un original erróneo o sustituido, con aprobación | La extensión `sources`, no en modo autónomo |

### Fecha y hora {#date-and-time}

El kit no pone ninguna fecha en el prompt del sistema, y solo los subagentes tienen `Bash`, así que `current_time` es la forma en que un agente sabe qué día es. `date_math` existe porque los modelos suelen contar mal las fechas ("días hasta el 15 de noviembre", "tres semanas a partir del viernes"); sus días laborables son de lunes a viernes, sin festivos. Ambas responden en la zona horaria del sistema, o en `config.timeZone`:

```ts
const config = { mode: "guided", projectDir, timeZone: "Atlantic/Canary" };
```

Solo leen, así que funcionan en todos los modos, incluido el modo plan. Un subagente las recibe por su nombre, `tools: ["mcp__time__current_time", "mcp__time__date_math"]`; un agente que no las quiera las deja fuera con `disallowedTools`.

```json
{"operation": "difference", "from": "2026-10-01", "to": "2026-11-15"}
→ {"days": 45, "weeks": 6, "remainderDays": 3, "workingDays": 31, "toWeekday": "Sunday", …}

{"operation": "add", "from": "2026-01-31", "amount": 1, "unit": "months"}
→ {"date": "2026-02-28", "weekday": "Saturday", …}
```

## Herramientas en proceso: `tool()` y `createSdkMcpServer()` {#in-process-tools-tool-and-createsdkmcpserver}

La forma más rápida de darle una capacidad a un agente es una función de TypeScript, expuesta como herramienta de un servidor MCP que se ejecuta dentro de tu proceso. El kit reexporta ambas funciones del SDK:

```ts
import { createSdkMcpServer, tool } from "@falkenslab/agent-kit";
import { z } from "zod";

const inventory = createSdkMcpServer({
  name: "inventory",
  version: "1.0.0",
  tools: [
    tool(
      "find_product",
      "Find products in the inventory by name. Returns up to 10 matches with their stock.",
      {
        query: z.string().describe("Part of the product's name"),
        inStockOnly: z.boolean().optional().describe("Only products with stock"),
      },
      async ({ query, inStockOnly }) => {
        const products = await db.products.search(query, { inStockOnly });
        return { content: [{ type: "text" as const, text: JSON.stringify(products.slice(0, 10), null, 2) }] };
      },
      { annotations: { readOnlyHint: true } },
    ),
    tool(
      "reserve_product",
      "Reserve units of a product for an order. Fails if there isn't enough stock.",
      { productId: z.string(), units: z.number().int().positive() },
      async ({ productId, units }) => {
        try {
          await db.products.reserve(productId, units);
          return { content: [{ type: "text" as const, text: `Reserved ${units} of ${productId}.` }] };
        } catch (error) {
          return { content: [{ type: "text" as const, text: `Couldn't reserve: ${(error as Error).message}` }], isError: true };
        }
      },
    ),
  ],
});

const spec: AgentSpec<BaseSessionConfig> = {
  // …
  buildMcpServers: () => ({ inventory }),
};
```

El modelo ve las herramientas como `mcp__inventory__find_product` y `mcp__inventory__reserve_product`.

Pautas para que las herramientas funcionen bien con el modelo:

- **Describe cuándo usarla**, no solo qué hace. La descripción es la única documentación que tiene el modelo.
- **Describe cada parámetro** con `.describe()`.
- **Devuelve texto sobre el que el modelo pueda actuar**: un mensaje de éxito claro, o un error con `isError: true` y qué hacer en su lugar. Una excepción lanzada se convierte en un fallo genérico.
- **Marca las herramientas de solo lectura** con `readOnlyHint`.
- **Deja las herramientas peligrosas detrás de la herramienta de aprobación**: en modo guiado, indica en tu prompt del sistema (o en la descripción de la herramienta) que pida aprobación antes de llamarla.

:::tip Una herramienta en lugar de Bash
Si un subagente necesita una capacidad concreta (consultar algo, ejecutar un comando), dale una herramienta que haga exactamente eso, en lugar de `Bash`. El grumete del reloj de Captain Whiskers lee la hora con `current_time` y `date_math` del kit, no con `Bash`. Consulta [Subagentes](subagents.md#tools-of-a-subagent).
:::

## Servidores MCP externos {#external-mcp-servers}

Sirve cualquier configuración de servidor MCP que acepte el SDK, con su nombre como clave:

```ts
buildMcpServers: (config, runDir) => ({
  // A local process over stdio.
  playwright: {
    command: "npx",
    args: ["@playwright/mcp@latest", "--output-dir", runDir],
  },
  // A remote server over HTTP.
  issues: {
    type: "http",
    url: "https://mcp.example.com/mcp",
    headers: { Authorization: `Bearer ${process.env.ISSUES_TOKEN}` },
  },
}),
```

Si un servidor no logra conectarse, la sesión arranca igualmente y el chat muestra un aviso con los servidores que han fallado (el [evento](../advanced/events.md) `mcp-error`).

El propio `.mcp.json` de un workspace (en `projectDir`) puede declarar más servidores, que se cargan con la configuración del proyecto (consulta [Permisos y aislamiento](../security/permissions-and-isolation.md)). El kit aprueba sus herramientas sin conocer sus nombres de antemano.

Un servidor del proyecto que duplica el de una extensión instalada (la misma URL remota, o el mismo paquete npm, sea cual sea su versión) se deja fuera de la sesión, por nombre (`settings.deniedMcpServers`), para que el de la extensión sea el único: dos servidores de Canva, uno con la sesión iniciada y otro no, o un moodle-mcp sin versión fija junto al de la extensión con sus propios cursos, confunden al modelo y se saltan la configuración de la extensión. Todos los demás servidores del proyecto se quedan, y el agente los usa como lo haría Claude Code. `/extensions` y `about_me` nombran lo que se dejó fuera: "programacion-1/.mcp.json también declara canva (https://mcp.canva.com/mcp): se usan los de las extensiones".

Un servidor también puede pedirle algo a la persona mientras se ejecuta una herramienta (un formulario, o una página que abrir): consulta [Servidores que preguntan a la persona](../human-in-the-loop/elicitation.md).

## Cómo se aprueban las herramientas MCP {#how-mcp-tools-are-approved}

El kit pasa `canUseTool: allowAnyMcpTool`: cualquier llamada `mcp__<server>__<tool>` se aprueba en silencio, y todo lo demás que llegue ahí se deniega. No hay una lista de servidores permitidos que mantener, porque un comodín de `allowedTools` como `mcp__*` no coincide con `mcp__<server>__<tool>` en el SDK (comprobado a mano), y los servidores de `.mcp.json` no se conocen de antemano.

Para mantener al modelo alejado de una herramienta concreta, prohíbela:

```ts
disallowedTools: [
  "mcp__playwright__browser_run_code_unsafe", // arbitrary code in the browser
  "mcp__issues__delete_issue",
],
```

`disallowedTools` se impone a todo: una herramienta prohibida nunca llega a `canUseTool` y nunca se ejecuta.

## Etiquetas amigables para tus herramientas {#friendly-labels-for-your-tools}

En el chat y en los registros, una llamada a una herramienta se muestra con una etiqueta. El kit tiene etiquetas para sus herramientas y para las integradas (`Reading notes.md`, `Searching the web for "…"`). Dale etiquetas a las tuyas con `createFriendlyToolLabel()`:

```ts
import { createFriendlyToolLabel, truncate } from "@falkenslab/agent-kit";

const formatAction = createFriendlyToolLabel({
  describe: (tool, input) => {
    if (tool === "find_product") return `Looking for "${truncate(String(input.query), 40)}" in the inventory`;
    if (tool === "reserve_product") return `Reserving ${input.units} × ${input.productId}`;
    return undefined; // fall back to the kit's labels
  },
  extraLocalServers: ["inventory"], // no "[inventory]" prefix for this server's tools
});

await runChatInk(opener, { runsDir, formatAction });
```

Consulta [Etiquetas de herramientas](../terminal-ui/tool-labels.md) para los detalles, y para ver cómo cuentan tus herramientas en el resumen de un grupo plegado.
