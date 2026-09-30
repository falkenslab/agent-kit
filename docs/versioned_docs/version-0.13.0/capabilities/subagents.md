---
sidebar_position: 3
title: Subagents
description: Delegate to specialist subagents safely - declaring them, their tools and models, and the gates that keep them in line.
---

# Subagents

A subagent is a separate agent the main one delegates a task to with the `Agent` tool: its own prompt, its own tools, often a smaller model, and its own context. The main agent gets back only its final answer. Use them to keep noisy work (web searches, long reads) out of the main context, to use a cheaper model for simple jobs, or to give a narrow capability to a narrow agent.

## Declaring subagents

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

`AgentDefinition` is the SDK's type (re-exported by the kit). Its most used fields:

| Field | What it's for |
| --- | --- |
| `description` | When the main agent should use it. The main agent reads it in the `Agent` tool's description. |
| `prompt` | The subagent's system prompt. It doesn't see the main agent's prompt or conversation, only the task the main agent writes. |
| `tools` | The tools it may use. Each must also be in the session's tools (see below). |
| `model` | `"haiku"`, `"sonnet"`, `"opus"`, a full model id, or `"inherit"`. |
| `maxTurns` | A cap on its turns. |
| `mcpServers` | MCP servers only this subagent sees. |
| `skills` | Skills preloaded into its context. |

Tell the main agent about its crew in the system prompt: when to use each one and what to do with the answer. The descriptions alone are often not enough for a consistent workflow.

The kit appends the [reply language](../sessions/languages.md) line to each subagent's prompt too.

## What returning subagents changes

When `buildSubagents()` returns something (not `undefined`):

1. The session gets the `Agent` tool, to delegate, and `Bash`.
2. `agents` is set to your definitions.
3. Three `PreToolUse` hooks are registered, the [subagent gates](../security/subagent-gates.md):
   - **type gate**: `Agent` may only spawn the types in `allowedSubagentTypes`;
   - **Bash gate**: `Bash` is denied to the main agent;
   - **foreground gate**: every allowed subagent runs in the foreground (`run_in_background: false`).

Return `undefined` for a configuration that doesn't need subagents, so neither tool is granted.

```ts
buildSubagents: (config) => (config.withResearch ? { agents: { researcher }, allowedSubagentTypes: ["researcher"] } : undefined),
```

## Tools of a subagent

A subagent can only use tools that exist in the session. The kit's session has `WebFetch`, `WebSearch`, the file tools (with a knowledge or sources folder), `Skill` (with plugins), `Bash` (with subagents) and every MCP tool from `buildMcpServers()`.

- **Built-in tools**: list them by name: `tools: ["WebSearch", "WebFetch"]`. A subagent with file tools is bound by the same [file scope](../security/file-scope.md) as the main agent.
- **Your MCP tools**: list them by their full name: `tools: ["mcp__clock__current_time"]`. Register the server in `buildMcpServers()`.
- **No tools**: `tools: []` for a subagent that only thinks.
- **Bash**: `tools: ["Bash"]`. Bash can reach any path and run anything the user can: keep it opt-in and prefer a tool that does exactly what's needed.

```ts
const clock = createSdkMcpServer({
  name: "clock",
  version: "1.0.0",
  tools: [
    tool("current_time", "The system's current date, time and time zone.", {}, async () => ({
      content: [{ type: "text" as const, text: new Date().toString() }],
    }), { annotations: { readOnlyHint: true } }),
  ],
});

const clockBoy: AgentDefinition = {
  description: "Reads the ship's clock (the system's date and time) and does time arithmetic.",
  prompt: "Read the clock with the current_time tool and do any time arithmetic yourself. Answer in one line.",
  tools: ["mcp__clock__current_time"],
  model: "haiku",
  maxTurns: 3,
};
```

## Subagents in the chat

The Ink chat shows a subagent's work under the `Agent` call that started it: its tool calls (the latest five, dimmed) and its answer's first line when it finishes. The spinner shows what the subagent is doing on a second line (`↳ Searching the web for "…"`). In interactive mode, the subagent's tool calls go through the approval panel too.

The session log (`session.log`) and the console only record the main agent's actions.
