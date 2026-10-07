---
sidebar_position: 4
title: Extensions
description: What an agent runs with besides the kit's core - the kit's knowledge base and sources folder, and extensions of the agent's own - how to enable them, what they bring, capabilities, and how to write one.
---

# Extensions

An agent is the kit's core (the chat, the modes and their gates, subagents, the transcript, languages) plus the **extensions** it enables. An extension is a Claude Code plugin (skills, commands, a manifest) with the code that says what it brings to a session: its tools, a section of the system prompt, the folders the file tools may reach, which of its tools only read. The kit ships two, and an agent can bring its own.

## Enabling them

```ts
const spec: AgentSpec<Config> = {
  // …
  extensions: ["sources", "knowledge", jokebookExtension],
};

const config: Config = {
  // …
  sourcesDir: path.join(workspace, "sources"), // "sources" needs it
  knowledgeDir: path.join(workspace, "knowledge"), // "knowledge" needs it
};
```

- The kit's are enabled **by name**; an agent's own **as an object** (see [Writing your own](#writing-your-own)).
- **None is on by default.** A folder in the config doesn't turn anything on by itself: `knowledgeDir` without `"knowledge"` is a folder of the agent's own notes, kept with the file tools under rules it writes itself.
- An extension the session lacks something for (its folder) is **left out**, and so is one whose required capabilities nothing enabled provides (see [Capabilities](#capabilities)). The system prompt says which ones are off and why, so the agent can tell the person.
- An unknown name is an error.

| Extension | Needs | What it brings |
| --- | --- | --- |
| `sources` | `sourcesDir` | The originals: the sources tools (`list_sources`, `extract_text`, `save_to_sources`, `download_to_sources`, and `request_file`, `retire_source` outside autonomous mode), `Read`/`Glob`/`Grep` on the folder, never writing it, and its prompt section. See [Sources](knowledge-base.md#sources-originals-kept-as-obtained). Provides `sources`. |
| `knowledge` | `knowledgeDir` | The [knowledge base](knowledge-base.md): the `knowledge_*` tools over a store, its prompt section with the person's preferences, its skills and commands; the file tools never reach the folder. Provides `knowledge-base`. |

They own their data and never call each other: the model connects them through their tools (see [Knowledge base and sources](knowledge-base.md#knowledge-base-and-sources)).

## What the agent sees

With any extension enabled, the system prompt gets an **Extensions** section after the agent's own prompt and identity, then each extension's own section:

```text
## Extensions
What you can do besides your own tools comes from these extensions; their sections below say how to use them.
- **sources**: The sources folder: originals kept as obtained, … Provides: sources.
- **knowledge**: Built-in knowledge base workflows (an LLM wiki) … Provides: knowledge-base.
- **jokebook**: The captain's own jokebook … Provides: jokes.
```

An extension that's off is listed too, with why ("it needs `knowledgeDir` in the config", "it requires memory, which no enabled extension provides"). The [`agent-help`](../core-concepts/agent-spec.md#identity-and-helpguide) skill tells the person the same.

## Capabilities

An extension's manifest says what it **provides** and what it **requires**, as capabilities: names, not other extensions.

- An extension that requires a capability no enabled extension provides is left out, and so is any that depended on it in turn.
- A **skill** can require capabilities too, in its frontmatter; it's only offered when they're there:

```markdown
---
name: rank-jokes
description: Rank the jokes in the logbook by the parrot's score…
requires: knowledge-base
---
```

`requires: a`, `requires: [a, b]` and a YAML list all work. A skill left out this way isn't listed to the model and is refused by the `Skill` tool. Since the SDK's `skillOverrides` doesn't reach plugin skills, leaving one out makes the session's `skills` a list (the plugins' skills and the project's) even when the spec says `"all"`.

The kit's capabilities are `sources` and `knowledge-base`; an agent names its own (miyagi's classroom capabilities, say), and two extensions may provide the same one.

## Writing your own

An extension of the agent's own is a plugin folder in its project, plus an object that implements `Extension`:

```text
my-agent/
├── jokebook.ts                       the extension: what it brings
└── extensions/jokebook/
    ├── .claude-plugin/plugin.json    its manifest
    ├── skills/rank-jokes/SKILL.md    its skills and commands, if any
    └── agents/loro-critico.md        its subagents, if any
```

```json
{
  "name": "jokebook",
  "description": "The captain's own jokebook: the classic pirate jokes, and ranking the jokes in his logbook.",
  "agent-kit": { "provides": ["jokes"], "requires": [] }
}
```

```ts
import path from "node:path";
import { createSdkMcpServer, tool, type Extension } from "@falkenslab/agent-kit";

export const jokebookExtension: Extension = {
  name: "jokebook", // the same as its plugin's
  plugin: path.join(__dirname, "extensions", "jokebook"),
  // missing: ({ config }) => (config.jokesDir ? undefined : "needs `jokesDir` in the config"),
  async contribute({ config, spec, runDir, mode, interactive }) {
    const classicJoke = tool("classic_joke", "A classic pirate joke from the jokebook, picked at random.", {}, async () => ({
      content: [{ type: "text" as const, text: pick(CLASSICS) }],
    }), { annotations: { readOnlyHint: true } });
    return {
      mcpServers: { jokebook: createSdkMcpServer({ name: "jokebook", version: "1.0.0", tools: [classicJoke] }) },
      promptSection: "## Your jokebook\nThe classics are in your own jokebook: `classic_joke` gives one.",
      readOnlyTools: ["mcp__jokebook__classic_joke"], // plan mode lets it through
      helpLines: ["Your jokebook: `classic_joke` gives a classic pirate joke."],
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
| `selfAskingTools` | Its tools that ask the person themselves (a panel): interactive mode doesn't ask before them. |
| `helpLines` | What `agent-help` says about it in this session. |
| `api` | What `buildSessionOptions()` hands back to the host (the knowledge extension returns its store as `knowledgeStore`). |

`missing(context)` says why the extension can't run in this session (a folder it needs), or `undefined`. The context has the config, the spec, the run folder, the mode and whether a person can be asked.

Its plugin is loaded like any of the agent's, so its skills, commands and subagents are named after it (`jokebook:rank-jokes`, `jokebook:loro-critico`); with `skills: "plugins"` its skills are offered without naming them, and its subagents (`agents/*.md`) are registered like the agent's own (see [Subagents in a plugin](subagents.md#subagents-in-a-plugin)).

## Where they run

The kit's extensions and an agent's own are **internal**: they run in the agent's process, so they can use the kit's internals (a store passed from code, the person's panels through the [interaction port](../human-in-the-loop/interaction-port.md), the gates). Extensions installed from a repository, which run in a separate process with a clean environment, come later ([ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md)).
