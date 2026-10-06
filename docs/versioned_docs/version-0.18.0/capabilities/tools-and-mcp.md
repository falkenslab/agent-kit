---
sidebar_position: 1
title: Tools and MCP servers
description: The tools an agent gets, how to give it its own with in-process or external MCP servers, and how to block tools.
---

# Tools and MCP servers

## The tools a session has

`buildSessionOptions()` only grants the built-in tools a configuration needs (see [Session options](../core-concepts/session-options.md#tools)):

- **always**: `WebFetch`, `WebSearch` and `TodoWrite` (a task list for long jobs, which the chats show above the prompt);
- **with `knowledgeDir` or `sourcesDir`**: `Read`, `Write`, `Edit`, `Glob`, `Grep`, all [scoped](../security/file-scope.md);
- **with file tools or plugins**: `Skill`;
- **with subagents**: `Agent`, and `Bash` (for subagents only) when one of them lists it or has no `tools`.

Everything else an agent does, it does through **MCP tools**: the kit's own and yours.

## The kit's own tools

Besides the built-in ones, the kit registers MCP tools of its own, each when it applies (see [Session options](../core-concepts/session-options.md#mcp-servers-and-permissions)):

| Tool | What it does | When |
| --- | --- | --- |
| `current_time` | The local date, time, weekday, time zone and UTC offset, and the instant in UTC | Always |
| `date_math` | Exact date arithmetic: days, weeks and working days between two dates; a date plus or minus days, weeks, months or working days | Always |
| `request_human_approval` | Asks a person before an action that's hard to undo. See [Approvals](../human-in-the-loop/approvals.md) | Not in autonomous mode |
| `ask_human` | Asks the person to choose between options, within the turn. See [Choices and plans](../human-in-the-loop/choices-and-plans.md) | Not in autonomous mode |
| `present_plan` | Shows the plan; the person runs it (leaving plan mode), keeps planning or cancels | Only in plan mode |
| `request_manual_login` | Waits for a person to act by hand. See [Manual intervention](../human-in-the-loop/manual-intervention.md) | With `manualInterventionTexts`, not in autonomous mode |
| `knowledge_*` (10 tools) | The knowledge base, as pages: index, search, read, create, edit, rewrite, supersede, retire, log, check. See [Knowledge base](knowledge-base.md#the-tools) | With `knowledgeDir` (the built-in knowledge base) |
| `list_sources`, `extract_text`, `save_to_sources`, `download_to_sources` | List the originals with their status and when each last changed; read a DOCX, PPTX or XLSX one; add one from the run's folder or a URL, never overwriting. See [Sources](knowledge-base.md#sources-originals-kept-as-obtained) | With `sourcesDir` |
| `request_file`, `retire_source` | Ask the person for a file; take out a wrong or superseded original, with approval | With `sourcesDir`, not in autonomous mode |

### Date and time

The kit puts no date in the system prompt, and only subagents have `Bash`, so `current_time` is how an agent knows what day it is. `date_math` exists because models often miscount dates ("days until 15 November", "three weeks from Friday"); its working days are Monday to Friday, with no holidays. Both answer in the system's time zone, or in `config.timeZone`:

```ts
const config = { mode: "guided", projectDir, timeZone: "Atlantic/Canary" };
```

They only read, so they work in every mode, plan mode included. A subagent gets them by name, `tools: ["mcp__time__current_time", "mcp__time__date_math"]`; an agent that doesn't want them leaves them out with `disallowedTools`.

```json
{"operation": "difference", "from": "2026-10-01", "to": "2026-11-15"}
→ {"days": 45, "weeks": 6, "remainderDays": 3, "workingDays": 31, "toWeekday": "Sunday", …}

{"operation": "add", "from": "2026-01-31", "amount": 1, "unit": "months"}
→ {"date": "2026-02-28", "weekday": "Saturday", …}
```

## In-process tools: `tool()` and `createSdkMcpServer()`

The fastest way to give an agent a capability is a TypeScript function, exposed as a tool of an MCP server that runs inside your process. The kit re-exports both functions from the SDK:

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

The model sees the tools as `mcp__inventory__find_product` and `mcp__inventory__reserve_product`.

Guidelines that make tools work well with the model:

- **Describe when to use it**, not only what it does. The description is the model's only documentation.
- **Describe every parameter** with `.describe()`.
- **Return text the model can act on**: a clear success message, or an error with `isError: true` and what to do instead. A thrown exception becomes a generic failure.
- **Mark read-only tools** with `readOnlyHint`.
- **Keep dangerous tools behind the approval tool**: in guided mode, say in your system prompt (or the tool's description) to ask for approval before calling it.

:::tip A tool instead of Bash
If a subagent needs one specific capability (look something up, run one command), give it a tool that does exactly that, rather than `Bash`. Captain Whiskers' clock cabin boy reads the time with the kit's `current_time` and `date_math`, not with `Bash`. See [Subagents](subagents.md#tools-of-a-subagent).
:::

## External MCP servers

Any MCP server config the SDK accepts works, keyed by name:

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

If a server fails to connect, the session still starts and the chat shows a notice listing the failed servers (the `mcp-error` [event](../advanced/events.md)).

A workspace's own `.mcp.json` (in `projectDir`) can declare more servers, loaded with the project's settings (see [Permissions and isolation](../security/permissions-and-isolation.md)). The kit approves their tools without knowing their names in advance.

## How MCP tools are approved

The kit passes `canUseTool: allowAnyMcpTool`: any `mcp__<server>__<tool>` call is approved silently, anything else that reaches it is denied. There's no per-server allow list to maintain, because an `allowedTools` wildcard like `mcp__*` doesn't match `mcp__<server>__<tool>` in the SDK (confirmed by hand), and servers from `.mcp.json` aren't known ahead of time.

To keep the model away from a specific tool, disallow it:

```ts
disallowedTools: [
  "mcp__playwright__browser_run_code_unsafe", // arbitrary code in the browser
  "mcp__issues__delete_issue",
],
```

`disallowedTools` wins over everything: a disallowed tool never reaches `canUseTool` and never runs.

## Friendly labels for your tools

In the chat and the logs, a tool call is shown with a label. The kit has labels for its own and the built-in tools (`Reading notes.md`, `Searching the web for "…"`). Give yours labels with `createFriendlyToolLabel()`:

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

See [Tool labels](../terminal-ui/tool-labels.md) for the details, and for how your tools count in a folded group's summary.
