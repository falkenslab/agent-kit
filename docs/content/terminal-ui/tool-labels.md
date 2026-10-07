---
sidebar_position: 5
title: Tool labels
description: Friendly labels for tool calls, and how tools count in folded summaries.
---

# Tool labels

A tool call is shown as a short sentence instead of its technical name: `Reading knowledge/index.md` instead of `Read {"file_path": "…"}`. The chats, the progress view and the logs use a `formatAction(toolName, input)` function; by default `createFriendlyToolLabel()`.

## The kit's labels

| Tool | Label |
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
| `TodoWrite` | `Updating the task list` (not shown in the chats, which draw the list) |

Labels follow the [kit's language](../sessions/languages.md). Long paths keep their end (`…/course/knowledge/index.md`), long text its start.

Any other tool gets its name with underscores as spaces. An MCP tool from a server that isn't local is prefixed with the server: `[inventory] find product`.

## An extension's labels

An [extension](../capabilities/extensions.md) brings its tools' labels with what it contributes (`toolLabels`), so the chat shows them without the agent doing anything. The kit's own:

| Extension | Tool | Label |
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
| `memory` | `recall` | `Looking through what it remembers of you`, or `Recalling "<entry>"` with a name |
| `memory` | `remember` | `Remembering "<entry>"` |
| `memory` | `forget` | `Forgetting "<entry>"` |

For your own extension, give each tool, by its full name, a `label` from its input and, optionally, the `phrase` it counts with in a [folded summary](#folded-summaries), in the kit's language (`getLanguage()`, already chosen when `contribute()` runs):

```ts
import { getLanguage, type Extension, type Language, type ToolPhrase } from "@falkenslab/agent-kit";

const LABELS: Record<Language, { label: string; phrase: ToolPhrase }> = {
  en: { label: "Opening the jokebook", phrase: ["opened the jokebook", "opened the jokebook {n} times"] },
  es: { label: "Abriendo el libro de chistes", phrase: ["abrió el libro de chistes", "abrió el libro de chistes {n} veces"] },
  fr: { label: "Ouverture du recueil de blagues", phrase: ["a ouvert le recueil de blagues", "a ouvert le recueil de blagues {n} fois"] },
  de: { label: "Witzebuch aufschlagen", phrase: ["Witzebuch aufgeschlagen", "Witzebuch {n}-mal aufgeschlagen"] },
};

export const jokebookExtension: Extension = {
  // …
  async contribute() {
    const { label, phrase } = LABELS[getLanguage()];
    return {
      // …
      toolLabels: { mcp__jokebook__classic_joke: { label: () => label, phrase } },
    };
  },
};
```

`buildSessionOptions()` hands back the active extensions' labels as `toolLabels`. `runChatInk()` and `runChatTui()` take them from a session opener (one that returns its whole result), and they come before `formatAction` and `toolPhrase`. With plain `Options`, pass them yourself (`toolLabels: built.toolLabels`); for the [progress view](progress-view.md) or a host of your own, `withToolLabels()` and `withToolPhrases()` put them in front of a `formatAction` and a `toolPhrase`:

```ts
import { buildSessionOptions, createProgressView, withToolLabels, withToolPhrases } from "@falkenslab/agent-kit";

const built = await buildSessionOptions(config, runDir, spec);
const view = createProgressView({
  formatAction: withToolLabels(() => built.toolLabels),
  toolPhrase: withToolPhrases(() => built.toolLabels),
});
```

## Labels for your tools

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

`truncate(text, max = 60)` cuts the end with `…`; `truncatePath(path, max = 60)` cuts the start, keeping the file name.

## Folded summaries

With Ctrl+O, a group of consecutive tool calls folds into one line: "Read 2 files, searched the web, ran 1 subagent". The kit has phrases for the built-in tools; any other counts as "used N tools". Give your tools their own with `toolPhrase`:

```ts
import type { ToolPhrase } from "@falkenslab/agent-kit";

const toolPhrase = (tool: string): ToolPhrase | undefined => {
  if (tool === "mcp__playwright__browser_navigate") return ["opened {n} page", "opened {n} pages"];
  if (tool === "mcp__playwright__browser_click") return ["clicked {n} time", "clicked {n} times"];
  return undefined;
};

await runChatInk(opener, { runsDir, toolPhrase });
```

A `ToolPhrase` is `[one, many]`, with `{n}` for the count. Calls with the same phrase are counted together, in the order they first appear, and the line starts with a capital.

## How much shows

`toolDetail` chooses how much of the tool calls the chat (and the progress view) shows until Ctrl+O:

| Level | What shows |
| --- | --- |
| `"full"` (default) | Every call with its result line. |
| `"calls"` | Every call without its result. A failed call shows one short line in the kit's language ("Couldn't complete it"), not the tool's error. |
| `"summary"` | One summary line per group, as above. |

```text
"full"                                   "calls"                         "summary"
● Fetching https://example.com           ● Fetching https://example.com    Fetched 1 page, ran 1 shell command
  ⎿  ### Ran Playwright code (+12 lines) ● Running "npm test"
● Running "npm test"                       ⎿  Couldn't complete it
  ⎿  npm ERR! missing script: test
```

Ctrl+O unfolds any level into the full view, and folds it back. Only the screen changes: `session.log` and `transcript.jsonl` are the same whatever the level. `"full"` suits whoever develops the agent; `"calls"` or `"summary"` an audience that doesn't need the tools' output, which is written for the model.

## Results for your tools

The result line is the first line of the tool's output, often written for the model (Playwright's `### Ran Playwright code`, the CLI's `Web search results for query: …`). `formatResult` gives your own, as `formatAction` does for labels: a string replaces the line, `null` hides it, `undefined` keeps the kit's.

```ts
import type { ResultFormatter } from "@falkenslab/agent-kit";

const formatResult: ResultFormatter = (tool, result) => {
  if (!tool.startsWith("mcp__playwright__")) return undefined; // the kit's line
  if (result.isError) return "The browser couldn't do it";
  return tool === "mcp__playwright__browser_snapshot" ? null : "Done"; // a snapshot needs no line
};

await runChatInk(opener, { runsDir, formatResult });
```

The string is plain text, drawn in the theme's `toolResult` role, or `error` for a failed call. `formatResult` applies wherever results show: in `"full"`, and in any level unfolded with Ctrl+O.

## Coloring labels

Labels are drawn in the theme's `toolLabel` role (dimmed by default). An agent can still color inside its own labels (with `ui.*` or picocolors); see [Themes](themes.md).
