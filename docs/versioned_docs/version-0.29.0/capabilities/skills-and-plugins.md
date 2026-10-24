---
sidebar_position: 2
title: Skills and plugins
description: Give an agent skills and slash commands through local plugins and the project's .claude folder, and choose which skills it offers.
---

# Skills and plugins

A **skill** is a folder with a `SKILL.md`: instructions the model loads when it decides they apply (it sees each skill's name and description, and calls the `Skill` tool to load one). A **slash command** is a markdown file the person triggers by typing `/name`: its body is sent as the message. Both are Claude Code features the SDK brings along; the kit wires them.

## A local plugin

Package an agent's own skills and commands as a plugin:

```text
plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── pirate-joke/
│   │   └── SKILL.md
│   └── miau/
│       └── SKILL.md
└── commands/
    ├── joke.md
    └── fresh-joke.md
```

```json title="plugin/.claude-plugin/plugin.json"
{
  "name": "captain-whiskers",
  "description": "Captain Whiskers' own skills and slash commands."
}
```

```md title="plugin/skills/pirate-joke/SKILL.md"
---
name: pirate-joke
description: How to build a pirate or sailor pun before telling it.
---

# Building a pirate joke

1. Start from a sailor word with a double meaning (anchor, mutiny, compass…).
2. Force the pun against something from the human's everyday life.
3. Finish with a pirate exclamation ("Arrr!", "Yo ho ho!").
```

```md title="plugin/commands/joke.md"
---
description: Ask the captain to tell a pirate joke.
---

Tell a pirate joke following the "pirate-joke" skill.
```

Load it from the spec:

```ts
pluginRoots: () => [path.join(__dirname, "plugin")],
```

Plugin skills and commands are namespaced with the plugin's name: the skill is `captain-whiskers:pirate-joke`, the command `/captain-whiskers:joke`. A command can take arguments: `$ARGUMENTS` in its body is replaced by whatever follows the command.

Plugins are loaded whenever `pluginRoots()` returns at least one folder, even without file tools, and the session gets the `Skill` tool.

## The project's own skills and commands

With the `"project"` setting source (the default), the SDK also finds `<projectDir>/.claude/skills/` and `<projectDir>/.claude/commands/`. That's where a workspace keeps skills specific to it, as a person would for Claude Code. Set `settingSources: []` to ignore them.

## Choosing which skills the agent offers

By default a session offers every skill it finds (`skills: "all"`): the plugins', the project's and the SDK's own, about twenty of them (`deep-research`, `dataviz`, `code-review`, `loop`…) even with `settingSources: []`. Each one costs context on every call (its name and description are listed to the model), and unrelated skills distract it.

Offer only the skills of the plugins your agent loads, without naming them:

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  pluginRoots: () => [path.join(__dirname, "plugin")],
  skills: "plugins", // its own and its extensions'
};
```

Or list them by name, to leave some out:

```ts
skills: ["captain-whiskers:pirate-joke", "captain-whiskers:miau"],
```

- Names are a skill's `name`, or `plugin:skill` for a plugin's, where `skill` is **the skill's folder** under `skills/`, whatever its frontmatter's `name` says. A `SKILL.md` without frontmatter isn't loaded.
- The enabled extensions' skills (the knowledge base's, `awareness:help`) are added to your list automatically.
- It's a **context filter, not a sandbox**: unlisted skills are hidden from the model and refused by the `Skill` tool, but their files stay on disk.
- **Slash commands keep working** when they aren't listed: a command is typed by the person, not chosen by the model.

Captain Whiskers went from about 15.7k to 11.4k input tokens per call by offering only its own skills and loading no settings (`settingSources: []`). See [Context and cost](../sessions/context-and-cost.md).

## Commands in the chat

The chats list every command the session knows for completion (Tab after `/`) and catch a mistyped one before it reaches the model: an unknown `/command` shows "Unknown command" instead of being sent as text. The chat's own local commands are `/exit` and `/quit` (configurable), `/copy` (the last reply to the clipboard), `/resume` (with a runs folder) and `/plan` (plan mode on or off). With the [awareness](awareness.md) extension, the agent can explain them itself.

## Writing good skills

- The **description** decides when the model loads a skill: say what it's for and when to apply it.
- Keep a skill **focused** on one job; split long ones.
- Write skills **in the language you want the replies in, or in English**. Text in another language pulls the replies towards it (see [Languages](../sessions/languages.md#limits)).
- A skill can reference files next to its `SKILL.md`; the model reads them when it needs them (with file tools).
