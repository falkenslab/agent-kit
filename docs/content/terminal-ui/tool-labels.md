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
| `save_to_sources` | `Saving a file to sources/<destination>` |

Labels follow the [kit's language](../sessions/languages.md). Long paths keep their end (`…/course/knowledge/index.md`), long text its start.

Any other tool gets its name with underscores as spaces. An MCP tool from a server that isn't local is prefixed with the server: `[inventory] find product`.

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
