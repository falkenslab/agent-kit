# jokebook

An [agent-kit](https://falkenslab.github.io/agent-kit/) extension: a book of classic pirate jokes, a critic parrot who scores jokes, and ranking the jokes an agent keeps in its knowledge base. It's the extension Captain Whiskers installs, and any agent on agent-kit can install it too.

- **Version**: 1.0.0
- **Author**: Falkenslab
- **License**: MIT
- **Works with**: agent-kit `>=0.18.0 <0.20.0`

## What it offers

| What | Name | What it does |
| --- | --- | --- |
| Tool | `classic_joke` | A classic pirate joke from the book, word for word, picked at random. Only reads: plan mode lets it through. |
| Skill | `jokebook:rank-jokes` | Ranks the jokes in the knowledge base by their score and files the ranking back as a synthesis page. |
| Subagent | `jokebook:loro-critico` | A grumpy parrot who scores a joke from 1 to 10 and suggests how to improve it. Uses no tools, on `haiku`. |

- **Provides**: the `jokes` capability.
- **Requires**: nothing to run. Its `rank-jokes` skill requires the `knowledge-base` capability (agent-kit's `knowledge` extension): without it, the skill isn't offered and the rest still works.

## Installing it

From the agent's own command, with this folder or the repository it lives in:

```
<agent> extension add ./extensions/jokebook                  # for all the agent's projects
<agent> extension add ./extensions/jokebook --project        # for this project only
<agent> extension add https://github.com/falkenslab/agent-kit#main --path examples/captain-whiskers/extensions/jokebook
```

In the chat, `/extensions` shows it, and `/extensions disable jokebook` or `enable jokebook` turns it off and on.

## How it's built

- `.claude-plugin/plugin.json`: its manifest. The plugin's fields (name, version, author…) plus agent-kit's under `"agent-kit"`: the capabilities, its server, the tools that only read, the chat labels in English, Spanish, French and German, and the help line.
- `server/index.mjs`: its MCP server. A Node script with no dependencies (it's installed by copying the folder), speaking MCP over stdio by hand. agent-kit starts it in its own process, with none of the agent's environment variables but the system's. It tells the model what the book is for in its `instructions`.
- `skills/rank-jokes/SKILL.md`: the ranking.
- `agents/loro-critico.md`: the parrot.

Nothing in it is in English by accident: everything the model reads is in English, and the agent tells the jokes in the language of the conversation.
