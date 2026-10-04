---
sidebar_position: 3
title: Your first agent
description: A step-by-step tutorial, from a chat with a system prompt to an agent with its own tool, notes, oversight and resumable conversations.
---

# Your first agent

This tutorial builds a small research assistant, **Scout**, one step at a time. Each step is a complete `agent.ts` you can run with `npx tsx agent.ts`; each adds one capability of the kit.

Before you start, set up a project as in [Installation](installation.md) and make sure [authentication](authentication.md) works (`CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` in the environment).

## Step 1: a chat with a system prompt

```ts title="agent.ts"
import path from "node:path";
import {
  buildSessionOptions,
  ensureClaudeAuth,
  runChatInk,
  type AgentSpec,
  type BaseSessionConfig,
} from "@falkenslab/agent-kit";

// 1. Who the agent is. Only buildSystemPrompt says something here; the rest is "nothing".
const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You are Scout, a concise research assistant. Answer in short paragraphs.",
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};

// 2. Credentials: offers to create a token if there's none.
await ensureClaudeAuth();

// 3. How it runs: the oversight mode and the folder it works in.
const config: BaseSessionConfig = { mode: "autonomous", projectDir: process.cwd() };

// 4. The chat. With a session opener and runsDir, every run gets its own folder under .run/.
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: { title: "Scout" },
  welcomeMessage: "Ask me anything. /exit to leave.",
});
```

Run it and you get a full chat: streamed replies with markdown, `/exit` or Ctrl+C to leave, ↑/↓ and Ctrl+R for history, `?` for the shortcuts.

What happened:

- `buildSessionOptions()` built the SDK's `Options`: the system prompt (plus one line about the [reply language](../sessions/languages.md)), the tools this configuration gets (only `WebFetch` and `WebSearch` here), the security hooks and the settings the kit always sets.
- `runChatInk()` called your opener with a new run folder (`.run/2026-09-29T10-15-00-000Z/`), started the session and drew the chat. Everything the terminal showed goes to that folder's `session.log`; the conversation, to `conversation.jsonl`.

:::tip Add `.run/` to `.gitignore`
The run folders hold whole conversations and tool results, not redacted. Never commit them.
:::

## Step 2: full screen, guided mode

```ts
const config: BaseSessionConfig = { mode: "guided", projectDir: process.cwd() };

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: { title: "Scout", fields: { mode: config.mode } },
  mode: config.mode,
  fullscreen: true,
  welcomeMessage: "Ask me anything. /exit to leave.",
});
```

- `fullscreen: true` takes the whole terminal: the history scrolls in its own view (PageUp/PageDown, the wheel), the prompt stays at the bottom, dragging selects text and a right-click copies it.
- In `guided` mode the agent gets a `request_human_approval` tool and must call it before anything visible to others or hard to undo; an approval panel appears in the chat. **Shift+Tab** switches to `interactive`, where every tool call asks first, and then to `plan`, where the agent only reads and plans. See [Modes](../core-concepts/modes.md).

## Step 3: a tool of its own

Every session already has a few tools of the kit, such as `current_time` and `date_math` for dates (see [The kit's own tools](../capabilities/tools-and-mcp.md#the-kits-own-tools)). Your own are MCP servers. The simplest is an in-process server built with `tool()` and `createSdkMcpServer()`, returned from `buildMcpServers()`:

```ts
import { createSdkMcpServer, tool } from "@falkenslab/agent-kit";
import { z } from "zod";

// Metres per unit.
const LENGTHS: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 };

const units = createSdkMcpServer({
  name: "units",
  version: "1.0.0",
  tools: [
    tool(
      "convert_length",
      "Convert a length between units (mm, cm, m, km, in, ft, mi). Use it instead of converting yourself.",
      {
        value: z.number().describe("The length to convert"),
        from: z.enum(["mm", "cm", "m", "km", "in", "ft", "mi"]),
        to: z.enum(["mm", "cm", "m", "km", "in", "ft", "mi"]),
      },
      async ({ value, from, to }) => {
        const result = (value * LENGTHS[from]) / LENGTHS[to];
        return { content: [{ type: "text" as const, text: `${value} ${from} = ${Number(result.toPrecision(10))} ${to}` }] };
      },
      { annotations: { readOnlyHint: true } },
    ),
  ],
});

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You are Scout, a concise research assistant. Use the tools for dates and unit conversions.",
  buildMcpServers: () => ({ units }),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};
```

Tool schemas use [zod](https://zod.dev) (`npm install zod`); a tool without parameters takes `{}`. The kit approves every `mcp__*` tool automatically, so the agent can call `mcp__units__convert_length` right away. See [Tools and MCP servers](../capabilities/tools-and-mcp.md).

## Step 4: notes that survive the session

Give the agent a `knowledgeDir` and it gets the kit's [knowledge base](../capabilities/knowledge-base.md): its own tools, rules and skills to keep its notes as an interlinked wiki.

```ts
const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: process.cwd(),
  knowledgeDir: path.resolve("knowledge"), // the agent's notes, through the knowledge_* tools
  sourcesDir: path.resolve("sources"), // originals: readable, never modified
};
```

Now Scout keeps its notes with the `knowledge_*` tools (search, read, create, edit, log…), reads the originals in `sources/` with `Read` but never modifies them (it adds files there with the sources tools, which never overwrite, and `list_sources` tells it what isn't ingested yet). Try `/knowledge:ingest` after dropping a PDF in `sources/`.

## Step 5: resume a conversation

It's already there since step 1: start with `npx tsx agent.ts --continue` to pick up the latest conversation, or type `/resume` in the chat to choose one. See [Runs and resuming](../sessions/runs-and-resuming.md).

## Step 6: make it yours

```ts
import { ui } from "@falkenslab/agent-kit";

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: {
    title: "Scout",
    fields: { mode: config.mode },
    art: [ui.accent(" ▄▀▀▄ "), ui.accent(" █  █ "), ui.accent("  ▀▀  ")],
  },
  mode: config.mode,
  fullscreen: true,
  promptLabel: `${ui.user("you>")} `,
  agentLabel: ui.agent("Scout>"),
  firstPromptSuggestion: "what's new in TypeScript this year?",
  historyPath: path.resolve(".run/history.jsonl"),
  theme: { accent: "#56b6c2", selection: "#56b6c2" },
});
```

- `header.art`: a small logo left of the title, one string per row, single-column characters only.
- `promptLabel` and `agentLabel`: the labels in the plain chat and the session log.
- `firstPromptSuggestion`: the suggestion shown (and taken with Tab) before the first turn.
- `historyPath`: the ↑/↓ history, kept across runs.
- `theme`: only the colors you want to change. See [Themes](../terminal-ui/themes.md).

## Where to go next

- The whole shape of a spec: [AgentSpec](../core-concepts/agent-spec.md).
- Delegating to specialists: [Subagents](../capabilities/subagents.md).
- Running without a chat (a job, a script): [One-shot runs](../advanced/one-shot-runs.md).
- Driving the agent from a desktop app: [Custom hosts](../advanced/custom-hosts.md).
- A complete agent to read: [Captain Whiskers](../examples/captain-whiskers.md).
