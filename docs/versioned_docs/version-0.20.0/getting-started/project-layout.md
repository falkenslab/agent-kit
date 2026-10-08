---
sidebar_position: 4
title: Project layout
description: A recommended layout for an agent's repository and for the workspace it works in.
---

# Project layout

The kit doesn't impose a layout, but everything it does is relative to a few folders you choose. This is the layout the kit's own example and its real consumers use.

## The agent's repository

```text
my-agent/
├── package.json          "type": "module", depends on @falkenslab/agent-kit
├── tsconfig.json
├── .env                  CLAUDE_CODE_OAUTH_TOKEN=… (git-ignored)
├── .gitignore            .env, .run/, node_modules/
├── agent.ts              the entry point: spec, config, chat
├── prompts/              system prompt templates (createPromptLoader)
│   └── system.md
├── plugin/               the agent's own skills and slash commands
│   ├── .claude-plugin/
│   │   └── plugin.json   { "name": "my-agent" }
│   ├── skills/
│   │   └── some-skill/SKILL.md
│   └── commands/
│       └── some-command.md
└── .run/                 one folder per run (git-ignored)
    ├── history.jsonl     the ↑/↓ history, shared by every run
    └── 2026-09-29T10-15-00-000Z/
        ├── session.log         what the terminal showed, as plain text
        ├── transcript.jsonl    every tool call and result, secrets redacted
        ├── conversation.jsonl  the SDK's transcript of the conversation
        ├── subagents/          each subagent's transcript
        └── session.json        the SDK session's id, to resume it
```

## The workspace the agent works in

`projectDir` is the session's working directory. When the agent has notes or sources, they usually live inside it:

```text
workspace/                projectDir: the session's cwd
├── .claude/              the project's own skills, commands and settings (loaded by default)
│   ├── skills/
│   └── commands/
├── CLAUDE.md             project instructions (loaded by default)
├── .mcp.json             extra MCP servers for this workspace (optional)
├── knowledge/            knowledge({ dir }): the agent's notes (through the knowledge_* tools)
│   ├── index.md
│   ├── log.md
│   └── …
└── sources/              sources({ dir }): originals (read-only for the agent; .agent-kit/ holds the kit's bookkeeping)
```

For a single-purpose agent the workspace can be the agent's own repository (`projectDir: __dirname`, as in Captain Whiskers). An agent that serves many workspaces (one per course, per customer…) takes the workspace from its configuration and keeps its own code elsewhere.

## Where each piece is configured

| Folder | Set by | Page |
| --- | --- | --- |
| `projectDir` | `BaseSessionConfig.projectDir` | [Session config](../core-concepts/session-config.md) |
| The knowledge base, the sources, the memory | their extension's `dir` option, in `AgentSpec.extensions` (`knowledge({ dir })`, `sources({ dir })`, `memory({ dir })`) | [Extensions](../capabilities/extensions.md), [Knowledge base](../capabilities/knowledge-base.md) |
| Plugin folders | `AgentSpec.pluginRoots()` | [Skills and plugins](../capabilities/skills-and-plugins.md) |
| The runs folder | `runsDir` option of the chat | [Runs and resuming](../sessions/runs-and-resuming.md) |
| The run folder | passed to your session opener (`run.dir`) | [Session options](../core-concepts/session-options.md) |
| The history file | `historyPath` option of the chat | [Ink chat](../terminal-ui/ink-chat.md) |

:::note Resolve folders to absolute paths
The kit compares paths when it enforces the [file scope](../security/file-scope.md). Pass absolute paths (`path.resolve(...)`, or `path.join(__dirname, ...)`) so a different working directory never changes what the agent can reach.
:::
