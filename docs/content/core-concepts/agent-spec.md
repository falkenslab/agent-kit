---
sidebar_position: 2
title: AgentSpec
description: The contract an agent implements, member by member, with examples.
---

# AgentSpec

`AgentSpec<TConfig>` is everything about an agent's domain that the kit needs but doesn't decide: its system prompt, the MCP servers it always has, the folders with its skills and commands, and its subagents, plus a few optional knobs. `TConfig` is your config type (any type extending [`BaseSessionConfig`](session-config.md)); every method receives the full config, so it can depend on your own fields.

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

:::info Why not `AgentDefinition`?
The SDK already uses `AgentDefinition` for a single subagent's definition. `AgentSpec` is a level above: it decides, among other things, which subagents get registered.
:::

## Required members

### `buildSystemPrompt(config): string`

The system prompt for this session. Everything role-, mode- or domain-specific belongs here. The kit appends to it:

- the [knowledge base section](../capabilities/knowledge-base.md) when `config.knowledgeDir` is set and `knowledgeBase` isn't `false`;
- one line asking to reply in the [kit's language](../sessions/languages.md), unless `replyInLanguage` is `false`.

Long prompts are easier to maintain as files: see [Prompts](../capabilities/prompts.md) and `createPromptLoader()`.

```ts
buildSystemPrompt: (config) =>
  loadPrompt(config.mode === "autonomous" ? "system-autonomous.md" : "system.md", { course: config.courseUrl }),
```

### `buildMcpServers(config, runDir): Record<string, McpServerConfig>`

The MCP servers this agent always registers, keyed by server name. The kit adds its own next to them when they apply (approvals, manual intervention, save to sources), so don't register those. `runDir` is this run's folder, useful for a server that writes files (a browser that downloads into it, say).

```ts
buildMcpServers: (config, runDir) => ({
  clock, // an in-process server built with createSdkMcpServer()
  playwright: {
    command: "npx",
    args: ["@playwright/mcp@latest", "--output-dir", runDir],
  },
}),
```

Every `mcp__<server>__<tool>` call is approved automatically (see [Permissions](../security/permissions-and-isolation.md)); block the ones you don't want with `disallowedTools`. More in [Tools and MCP servers](../capabilities/tools-and-mcp.md).

### `pluginRoots(config): string[]`

Absolute paths of local plugins (folders with `.claude-plugin/plugin.json`, `skills/` and `commands/`) to load, in order. Return `[]` for none. See [Skills and plugins](../capabilities/skills-and-plugins.md).

```ts
pluginRoots: () => [path.join(__dirname, "plugin")],
```

### `buildSubagents(config)`

The subagents this configuration registers, and which of them the `Agent` tool may spawn, or `undefined` for none:

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

Returning something here also gives the session the `Agent` and `Bash` tools (Bash for subagents only) and registers the three [subagent gates](../security/subagent-gates.md). Return `undefined` when this configuration needs no subagents, so neither tool is granted. See [Subagents](../capabilities/subagents.md).

## Optional members

| Member | Default | What it does |
| --- | --- | --- |
| `disallowedTools?: string[]` | `[]` | Tools blocked whatever else allows them, e.g. an MCP tool you don't trust. Takes precedence over everything. |
| `saveToSourcesDescription?: string` | a generic description | The description of the `save_to_sources` tool (registered with `sourcesDir`), in your domain's words. |
| `knowledgeBase?: boolean` | `true` | With `knowledgeDir`, the built-in knowledge base (rules and plugin). `false` for an agent with its own rules for its notes. |
| `humanApprovalTexts?` | generic texts | `{ description, approved, rejected }` of the approval tool (guided mode). |
| `manualInterventionTexts?` | none | Its texts, and the opt-in, of the manual-intervention tool. |
| `replyInLanguage?: boolean` | `true` | The line asking the agent (and each subagent) to reply in the kit's language. |
| `settingSources?: SettingSource[]` | `["project"]` | Which Claude Code settings files the session loads. |
| `skills?: string[] \| "all"` | `"all"` | Which skills the agent offers. |
| `planMode?: PlanModeSpec` | none | In plan mode, the agent's plan files and its read-only MCP tools. |

### `disallowedTools`

```ts
// A browser-driving agent: this Playwright tool runs arbitrary code, so it's never allowed.
disallowedTools: ["mcp__playwright__browser_run_code_unsafe"],
```

The SDK checks `disallowedTools` before anything else: a disallowed tool never reaches the kit's permission callback, let alone runs. Built-in tools can be disallowed too (Captain Whiskers disallows `Read`, `Write` and `Glob`).

### `humanApprovalTexts`

The approval tool exists outside autonomous mode. Its description tells the model when to call it, so write it for your domain:

```ts
humanApprovalTexts: {
  description:
    "Call this right before publishing anything students will see (a grade, a forum post, a page). " +
    "Not for browsing or reading.",
  approved: "Approved by the teacher. Go ahead.",
  rejected: "The teacher rejected it. Don't publish it; ask what to change.",
},
```

See [Approvals](../human-in-the-loop/approvals.md).

### `manualInterventionTexts`

Setting it is what registers the `request_manual_login` tool (outside autonomous mode). It only makes sense for an agent that drives a live interface a person can step into, such as a browser window:

```ts
manualInterventionTexts: {
  toolDescription: "Call this when you can't log in by yourself; a person will log in by hand in the browser window.",
  confirmedMessage: "The person says they logged in. Check the page and continue.",
  checkpointTitle: "Manual login needed",
  checkpointLines: ["Log in in the browser window the agent opened, then confirm here."],
},
```

See [Manual intervention](../human-in-the-loop/manual-intervention.md).

### `settingSources` and `skills`

```ts
settingSources: [], // load no Claude Code settings or CLAUDE.md at all
skills: ["my-agent:pirate-joke", "my-agent:miau"], // only these skills are listed to the model
```

See [Permissions and isolation](../security/permissions-and-isolation.md) and [Context and cost](../sessions/context-and-cost.md).

## A complete spec

```ts title="spec.ts"
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPromptLoader, createSdkMcpServer, tool, type AgentSpec, type BaseSessionConfig } from "@falkenslab/agent-kit";

const here = path.dirname(fileURLToPath(import.meta.url));
const loadPrompt = createPromptLoader(path.join(here, "prompts"));

export interface Config extends BaseSessionConfig {
  audience: string;
}

const clock = createSdkMcpServer({
  name: "clock",
  version: "1.0.0",
  tools: [
    tool("current_time", "The current date and time.", {}, async () => ({
      content: [{ type: "text" as const, text: new Date().toString() }],
    })),
  ],
});

export const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => loadPrompt("system.md", { audience: config.audience }),
  buildMcpServers: () => ({ clock }),
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

### `planMode`

In [plan mode](modes.md#plan) the agent only reads and plans. Two callbacks say what else it may do there:

- `isPlanFile(filePath, config)`: whether `Write`/`Edit` may touch this file (absolute path). It must also be writable under the [file scope](../security/file-scope.md).
- `isReadOnlyTool(toolName, input)`: whether one of the agent's MCP tools only reads. Every MCP tool it doesn't vouch for is denied in plan mode.

```ts
planMode: { isReadOnlyTool: (toolName) => toolName === "mcp__clock__current_time" },
```

Without `planMode`, the agent can read, search, ask a person and delegate in plan mode, writes nothing and presents its plan in its reply.
