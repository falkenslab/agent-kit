---
sidebar_position: 8
title: Awareness
description: The awareness extension - the agent knows who it is and what it is right now (its mode, extensions and their tools, subagents, commands, context), and how its chat is used, and the person can ask it.
---

# Awareness

The `awareness` [extension](extensions.md) lets the agent know itself. Without it, the model only knows what your prompt says: asked "what mode are you in?", "what can you do?" or "how do I go back to yesterday's conversation?", it improvises, and a session changes under it (Shift+Tab, plan mode, an extension turned off). With it:

- **A "Who you are" section** in the system prompt: the agent's name, version and what it is, the agent-kit version it runs on, and where to look for the rest.
- **`about_me`**, a read-only tool that says what the agent is right now, read from the session on every call: its mode and the ones the person can switch to, its extensions with their tools and the ones off (with why), its subagents, its built-in tools, the commands the person can type, and how full its context is. With `part: "guide"`, the agent's own guide to its domain (the extension's `guide` option).
- **The `help` skill** (`awareness:help`), how the kit's chat is used, the same for every agent: the modes and how to switch them, approvals and questions, keys, slash commands, resuming, `--continue` and `--language`.

The model is told to answer from them, never from memory, and to say so when something isn't covered instead of inventing an option.

## Turning it on

```ts
const { version } = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8")) as { version: string };

const spec: AgentSpec<Config> = {
  // …
  identity: { name: "padawan", version, description: "an agent that takes a Moodle course as a student" },
  extensions: [awareness({ guide: path.join(__dirname, "guide.md") }), knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") })],
};
```

It needs [`identity`](../core-concepts/agent-spec.md#identity-and-the-guide) in the spec: without one it's off, "needs `identity` in the spec". It provides `self-awareness`. Only `name` is required. `guide`, the absolute path of a markdown file, is its only option and optional; without it, `about_me` says the agent has no guide of its own.

Write the guide in English, like the rest of what the model reads, and for the person's questions: the agent's own commands, its configuration (environment variables, config files), its folders, what it can do. Leave out the chat (the `help` skill covers it and changes with the kit) and what changes during a session (`about_me` says it). The guide is read each time it's asked for, so the agent needs no file tools.

## What `about_me` answers

A markdown page the model reads, in English, such as:

```md
# You, right now

You are Captain Whiskers 0.18.0: a retired pirate cat who tells jokes, on agent-kit 0.18.0.

## Mode

You are in **plan** mode now. The person can switch it with Shift+Tab to guided or interactive.

## Extensions

- **knowledge**: The logbook… Tools: knowledge_create, knowledge_read, …
- **memory** is off: it needs a folder (`dir`).

## Subagents you can delegate to
…
## Context

12% of the context window used (25k of 200k tokens).
```

The tools, commands and context come from the running session: before it has started, an extension's tools show as `mcp__<server>__*` and there are no commands. Each extension's `helpLines` (what it says about itself here, such as the memory's commands) go under it.

In plan mode `about_me` is let through like any read-only tool. In interactive mode it asks first, like every tool.

## The session's facts, for any extension

`about_me` reads `ExtensionContext.session()`, which every extension gets: the core's facts about the session (`SessionFacts`), read anew on each call, never another extension's data. Call it from a tool, not from `contribute()`, which runs before the session exists:

```ts
async contribute({ session }) {
  return { mcpServers: { dice: createDiceServer(async () => (await session()).mode) } };
}
```

The live part (the session's tools, skills, commands and context) reaches it through `runQuery()`, which finds the view on the options `buildSessionOptions()` returned, a spread copy included. A host that builds its own options leaves those parts empty.

## Costs

The prompt section is about 200 tokens and `about_me`'s definition about 150, on every call; the skill costs nothing until it's loaded.
