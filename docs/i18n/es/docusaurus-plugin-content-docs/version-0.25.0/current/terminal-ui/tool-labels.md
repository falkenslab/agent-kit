---
sidebar_position: 5
title: Etiquetas de herramientas
description: Etiquetas amigables para las llamadas a herramientas, y cómo cuentan las herramientas en los resúmenes plegados.
---

# Etiquetas de herramientas

Una llamada a herramienta se muestra como una frase corta en lugar de con su nombre técnico: `Reading knowledge/index.md` en lugar de `Read {"file_path": "…"}`. Los chats, la vista de progreso y los logs usan una función `formatAction(toolName, input)`; por defecto, `createFriendlyToolLabel()`.

## Las etiquetas del kit {#the-kits-labels}

| Herramienta | Etiqueta |
| --- | --- |
| `Read`, `Write`, `Edit` | `Reading <file>`, `Writing to <file>`, `Editing <file>` |
| `Glob` | `Searching for files matching "<pattern>"` |
| `Grep` | `Searching file contents for "<pattern>"` |
| `Bash` | `Running "<command>"` |
| `Agent` | `Delegating to "<subagent>": <description>` |
| `WebFetch` | `Fetching <url>` |
| `WebSearch` | `Searching the web for "<query>"` |
| `Skill` | `Applying the "<skill>" skill` |
| `request_human_approval` | `Asking for human approval: <summary>` |
| `request_manual_login` | `Waiting for a human to intervene manually` |
| `ask_human` | `Asking: <question>` |
| `present_plan` | `Presenting the plan` |
| `current_time`, `date_math` | `Checking the date and time`, `Calculating dates` |
| `TodoWrite` | `Updating the task list` (no se muestra en los chats, que dibujan la lista) |

Las etiquetas siguen el [idioma del kit](../sessions/languages.md). Las rutas largas conservan su final (`…/course/knowledge/index.md`), y los textos largos, su principio.

Cualquier otra herramienta recibe su nombre con los guiones bajos como espacios. Una herramienta MCP de un servidor que no es local lleva delante el servidor: `[inventory] find product`.

## Las etiquetas de una extensión {#an-extensions-labels}

Una [extensión](../extensions/overview.md) trae las etiquetas de sus herramientas con lo que aporta (`toolLabels`), así que el chat las muestra sin que el agente haga nada. Las propias del kit:

| Extensión | Herramienta | Etiqueta |
| --- | --- | --- |
| `sources` | `list_sources` | `Listing the sources` |
| `sources` | `extract_text` | `Reading <source>` |
| `sources` | `save_to_sources` | `Saving <destination> to the sources` |
| `sources` | `download_to_sources` | `Downloading <url> to the sources` |
| `sources` | `request_file` | `Asking for a file: <description>` |
| `sources` | `retire_source` | `Retiring the source <source>` |
| `knowledge` | `knowledge_index` | `Reading the knowledge base's index` |
| `knowledge` | `knowledge_search` | `Searching the knowledge base for "<query>"` |
| `knowledge` | `knowledge_read` | `Reading <page>` |
| `knowledge` | `knowledge_create` | `Creating <type>/<slug>` |
| `knowledge` | `knowledge_edit` | `Editing <page>` |
| `knowledge` | `knowledge_rewrite` | `Rewriting <page>` |
| `knowledge` | `knowledge_supersede` | `Marking <page> superseded` |
| `knowledge` | `knowledge_retire` | `Retiring <page>` |
| `knowledge` | `knowledge_log` | `Updating the knowledge base's log` |
| `knowledge` | `knowledge_check` | `Checking the knowledge base` |
| `memory` | `recall` | `Looking through what it remembers of you`, o `Recalling "<entry>"` con un nombre |
| `memory` | `remember` | `Remembering "<entry>"` |
| `memory` | `forget` | `Forgetting "<entry>"` |

Una [extensión instalada](../extensions/writing.md) las da en su manifiesto (`labels`, por herramienta e idioma). Una escrita en el código de tu agente da a cada herramienta, por su nombre completo, una `label` a partir de su entrada y, opcionalmente, la `phrase` con la que cuenta en un [resumen plegado](#folded-summaries), en el idioma del kit (`getLanguage()`, ya elegido cuando se ejecuta `contribute()`):

```ts
import { getLanguage, type Extension, type Language, type ToolPhrase } from "@falkenslab/agent-kit";

const LABELS: Record<Language, { label: (sides: string) => string; phrase: ToolPhrase }> = {
  en: { label: (sides) => `Rolling a ${sides}-sided die`, phrase: ["rolled once", "rolled {n} times"] },
  es: { label: (sides) => `Tirando un dado de ${sides} caras`, phrase: ["tiró una vez", "tiró {n} veces"] },
  fr: { label: (sides) => `Lance un dé à ${sides} faces`, phrase: ["a lancé une fois", "a lancé {n} fois"] },
  de: { label: (sides) => `Würfelt mit ${sides} Seiten`, phrase: ["einmal gewürfelt", "{n}-mal gewürfelt"] },
};

export const diceExtension: Extension = {
  // …
  async contribute() {
    const { label, phrase } = LABELS[getLanguage()];
    return {
      // …
      toolLabels: { mcp__dice__roll: { label: (input) => label(String(input.sides)), phrase } },
    };
  },
};
```

`buildSessionOptions()` devuelve las etiquetas de las extensiones activas como `toolLabels`. `runChatInk()` y `runChatTui()` las toman de un abridor de sesión (uno que devuelve su resultado completo), y van antes de `formatAction` y `toolPhrase`. Con `Options` simples, pásalas tú (`toolLabels: built.toolLabels`); para la [vista de progreso](progress-view.md) o un host propio, `withToolLabels()` y `withToolPhrases()` las ponen delante de un `formatAction` y un `toolPhrase`:

```ts
import { buildSessionOptions, createProgressView, withToolLabels, withToolPhrases } from "@falkenslab/agent-kit";

const built = await buildSessionOptions(config, runDir, spec);
const view = createProgressView({
  formatAction: withToolLabels(() => built.toolLabels),
  toolPhrase: withToolPhrases(() => built.toolLabels),
});
```

## Etiquetas para tus herramientas {#labels-for-your-tools}

```ts
import { createFriendlyToolLabel, truncate, truncatePath } from "@falkenslab/agent-kit";

const formatAction = createFriendlyToolLabel({
  // Called with the tool's short name (without "mcp__<server>__") and its input.
  describe: (tool, input) => {
    switch (tool) {
      case "browser_navigate":
        return `Opening ${truncate(String(input.url), 70)}`;
      case "browser_click":
        return `Clicking "${truncate(String(input.element), 50)}"`;
      case "save_report":
        return `Saving the report to ${truncatePath(String(input.path), 60)}`;
      default:
        return undefined; // the kit's label, or the tool's name
    }
  },
  // Servers whose tools are yours: no "[server]" prefix.
  extraLocalServers: ["playwright", "reports"],
});

await runChatInk(opener, { runsDir, formatAction });
```

`truncate(text, max = 60)` recorta el final con `…`; `truncatePath(path, max = 60)` recorta el principio, conservando el nombre del fichero.

## Resúmenes plegados {#folded-summaries}

Con Ctrl+O, un grupo de llamadas a herramientas consecutivas se pliega en una línea: "Read 2 files, searched the web, ran 1 subagent". El kit tiene frases para las herramientas integradas; cualquier otra cuenta como "used N tools". Da a tus herramientas las suyas con `toolPhrase`:

```ts
import type { ToolPhrase } from "@falkenslab/agent-kit";

const toolPhrase = (tool: string): ToolPhrase | undefined => {
  if (tool === "mcp__playwright__browser_navigate") return ["opened {n} page", "opened {n} pages"];
  if (tool === "mcp__playwright__browser_click") return ["clicked {n} time", "clicked {n} times"];
  return undefined;
};

await runChatInk(opener, { runsDir, toolPhrase });
```

Un `ToolPhrase` es `[one, many]`, con `{n}` para la cuenta. Las llamadas con la misma frase se cuentan juntas, en el orden en que aparecen por primera vez, y la línea empieza con mayúscula.

## Cuánto se muestra {#how-much-shows}

`toolDetail` elige cuánto de las llamadas a herramientas muestra el chat (y la vista de progreso) hasta pulsar Ctrl+O:

| Nivel | Qué se muestra |
| --- | --- |
| `"full"` (por defecto) | Cada llamada con su línea de resultado. |
| `"calls"` | Cada llamada sin su resultado. Una llamada fallida muestra una línea corta en el idioma del kit ("Couldn't complete it"), no el error de la herramienta. |
| `"summary"` | Una línea de resumen por grupo, como arriba. |

```text
"full"                                   "calls"                         "summary"
● Fetching https://example.com           ● Fetching https://example.com    Fetched 1 page, ran 1 shell command
  ⎿  ### Ran Playwright code (+12 lines) ● Running "npm test"
● Running "npm test"                       ⎿  Couldn't complete it
  ⎿  npm ERR! missing script: test
```

Ctrl+O despliega cualquier nivel en la vista completa, y lo vuelve a plegar. Solo cambia la pantalla: `session.log` y `transcript.jsonl` son iguales sea cual sea el nivel. `"full"` le va bien a quien desarrolla el agente; `"calls"` o `"summary"`, a un público que no necesita la salida de las herramientas, que está escrita para el modelo.

## Resultados para tus herramientas {#results-for-your-tools}

La línea de resultado es la primera línea de la salida de la herramienta, a menudo escrita para el modelo (el `### Ran Playwright code` de Playwright, el `Web search results for query: …` de la CLI). `formatResult` da la tuya, igual que `formatAction` hace con las etiquetas: una cadena sustituye la línea, `null` la oculta, `undefined` conserva la del kit.

```ts
import type { ResultFormatter } from "@falkenslab/agent-kit";

const formatResult: ResultFormatter = (tool, result) => {
  if (!tool.startsWith("mcp__playwright__")) return undefined; // the kit's line
  if (result.isError) return "The browser couldn't do it";
  return tool === "mcp__playwright__browser_snapshot" ? null : "Done"; // a snapshot needs no line
};

await runChatInk(opener, { runsDir, formatResult });
```

La cadena es texto plano, dibujado con el rol `toolResult` del tema, o `error` para una llamada fallida. `formatResult` se aplica allí donde se muestran resultados: en `"full"`, y en cualquier nivel desplegado con Ctrl+O.

## Colorear las etiquetas {#coloring-labels}

Las etiquetas se dibujan con el rol `toolLabel` del tema (atenuado por defecto). Aun así, un agente puede colorear dentro de sus propias etiquetas (con `ui.*` o picocolors); consulta [Temas](themes.md).
