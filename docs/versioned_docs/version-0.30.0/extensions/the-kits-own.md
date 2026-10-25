---
sidebar_position: 2
title: The kit's own
description: Enabling the kit's internal extensions (awareness, sources, knowledge, memory) with their factories and options, and writing an extension in your agent's own code.
---

# The kit's own, and your agent's

Internal extensions are code: the kit's four, made by their factories, and any your agent writes as an object. Both are `Extension`s, listed in the spec.

## Enabling the kit's

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

- The kit's are made by their **factories**, each with its own options; an agent's own is **an object** (see [below](#writing-one-in-your-agents-code)).
- A **folder option** (`dir`, a `FolderOption`) is a path, or a function of the session's config that returns one (or `undefined`): the spec is static, while the folders usually depend on the project. The factories are generic over the config type: `knowledge<Config>({ dir: (config) => config.courseDir })`.
- **None is on by default**, and only the spec's list turns one on: a folder belongs to the extension that names it.
- An extension the session lacks something for (its folder: "needs a folder (`dir`)") is **left out**, and so is one whose required capabilities nothing enabled provides (see [Capabilities](overview.md#capabilities)). The system prompt says which ones are off and why, so the agent can tell the person.

| Extension | Options | What it brings |
| --- | --- | --- |
| `awareness` | `awareness({ guide? })`: `guide`, the absolute path of a markdown guide to the agent's domain. Needs `identity` in the spec. | [Awareness](../capabilities/awareness.md): the "Who you are" prompt section, `about_me` (what the agent is right now, read from the session on every call, and its `guide`) and the `help` skill (how the kit's chat is used). Provides `self-awareness`. |
| `sources` | `sources({ dir, saveDescription? })`: `dir`, the originals' folder; `saveDescription`, the `save_to_sources` tool's description in the agent's words. | The originals: the sources tools (`list_sources`, `extract_text`, `save_to_sources`, `download_to_sources`, and `request_file`, `retire_source` outside autonomous mode), `Read`/`Glob`/`Grep` on the folder, never writing it, and its prompt section. See [Sources](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained). Provides `sources`. |
| `knowledge` | `knowledge({ dir, pageTypes?, store? })`: `dir`, the knowledge base's folder; `pageTypes`, [your own page types](../capabilities/knowledge-base.md#your-own-page-types); `store(config, dir)`, [another store](../capabilities/knowledge-store.md). | The [knowledge base](../capabilities/knowledge-base.md): the `knowledge_*` tools over a store, its prompt section with the person's preferences, its skills and commands; the file tools never reach the folder. Provides `knowledge-base`. |
| `memory` | `memory({ dir })`: `dir`, a folder of the agent's own outside any project. | The [memory of the person](../capabilities/memory.md), across all their projects: its tools (`recall`, `remember`, `forget`), its prompt section with what it remembers, `/memory:list` and `/memory:forget`; saved only from what the person wrote. Provides `person-memory`. |

They own their data and never call each other: the model connects them through their tools (see [Knowledge base and sources](../capabilities/knowledge-base.md#knowledge-base-and-sources)).

## Writing one in your agent's code

An extension only one agent needs, or one that needs the kit's internals (a panel, a store passed from code, its own folders for the file tools, hooks), is code in the agent: a plugin folder in its project plus an object that implements `Extension`. One any agent could use is better [installable](writing.md).

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

What a contribution may carry (every part optional):

| Field | What it does |
| --- | --- |
| `mcpServers` | Its MCP servers, by name: its tools are `mcp__<name>__<tool>`. |
| `promptSection` | A section of the system prompt, after the Extensions list. Keep it short: what it's for and its rules. Procedures go in skills. |
| `fileTools` | Built-in file tools the session must have (`Read`, `Glob`, `Grep`…). |
| `readOnlyDirs` | Folders the file tools may read and search, never write. |
| `toolOnlyDirs` | Folders reached only through its own tools, never the file tools, with what to use instead (the denial says it). |
| `readOnlyTools` | Its tools that only read: [plan mode](../core-concepts/modes.md#plan) lets them through; every other MCP tool is denied there. |
| `readOnlyHintServers` | Its MCP servers whose tools plan mode lets through when the server marks them `readOnlyHint: true`, asked while the session runs. An installed extension without `readOnlyTools` in its manifest sets it; one in your code usually lists `readOnlyTools` instead. |
| `selfAskingTools` | Its tools that ask the person themselves (a panel): interactive mode doesn't ask before them. |
| `toolLabels` | How the chat shows its tools, by full name: each one's line and how it counts in a folded summary, in the kit's language. See [An extension's labels](../terminal-ui/tool-labels.md#an-extensions-labels). |
| `hooks` | Its SDK hooks, by event, run after the kit's own (the memory hears the person's messages with `UserPromptSubmit`). |
| `helpLines` | What it says about itself in this session (its commands, its folder), which the [awareness](../capabilities/awareness.md) extension's `about_me` gives the agent. |
| `api` | What the extension hands the host: `buildSessionOptions()` returns every active extension's under `apis`, by name, and the chat controller's `api(name)` gives it (the `sources` extension's `addSource` at `apis.sources.addSource`, the knowledge base's store at `apis.knowledge.knowledgeStore`). |

`missing(context)` says why the extension can't run in this session (a folder it needs), or `undefined`. The context has the config, the spec, the run folder, the mode, whether a person can be asked, and `capabilities`: what the session's active extensions provide (their manifests' `provides`), for an extension that works differently beside another. It's known once the extensions are resolved, so it's empty in `missing()` and filled in `contribute()`: the knowledge base explains matching its summaries to the originals when `capabilities.has("sources")`.

Its plugin is loaded like any of the agent's, so its skills, commands and subagents are named after it (`dice:…`); with `skills: "plugins"` its skills are offered without naming them, and its subagents (`agents/*.md`) are registered like the agent's own (see [Subagents in a plugin](../capabilities/subagents.md#subagents-in-a-plugin)). Its manifest carries its capabilities under `metadata["agent-kit"]` (`provides`, `requires`), as an installed one's does ([Manifest reference](reference.md#metadataagent-kit)).
