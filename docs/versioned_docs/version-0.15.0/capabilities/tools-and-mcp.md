---
sidebar_position: 1
title: Tools and MCP servers
description: The tools an agent gets, how to give it its own with in-process or external MCP servers, and how to block tools.
---

# Tools and MCP servers

## The tools a session has

`buildSessionOptions()` only grants the built-in tools a configuration needs (see [Session options](../core-concepts/session-options.md#tools)):

- **always**: `WebFetch` and `WebSearch`;
- **with `knowledgeDir` or `sourcesDir`**: `Read`, `Write`, `Edit`, `Glob`, `Grep`, all [scoped](../security/file-scope.md);
- **with file tools or plugins**: `Skill`;
- **with subagents**: `Agent`, and `Bash` for subagents only.

Everything else an agent does, it does through **MCP tools**: the kit's own (approvals, manual intervention, save to sources) and yours.

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
If a subagent needs one specific capability (read the clock, run one command), give it a tool that does exactly that, rather than `Bash`. Captain Whiskers' clock cabin boy reads the time with a `current_time` tool of his own. See [Subagents](subagents.md#tools-of-a-subagent).
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
