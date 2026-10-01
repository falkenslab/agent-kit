---
sidebar_position: 3
title: Context and cost
description: What each call sends to the model, how to measure it, and how to make it smaller.
---

# Context and cost

Every call to the model sends the whole context: the system prompt (the CLI's, yours, and what the kit appends), the tool definitions, the skills listing, memory files, and the conversation so far. Most of it is cached between calls, but it still counts against the context window and the usage limits.

## What a session sends

Measured on Captain Whiskers answering "hola" (input tokens of one API call):

| Configuration | Input tokens |
| --- | --- |
| Every setting source (the SDK's default) | ~16.1k |
| `settingSources: ["project"]` (the kit's default) | ~15.7k |
| `settingSources: []`, its own two skills only, no auto-memory | ~11.4k |

Most of the fixed part is the tools' definitions (about 6k tokens) and the skills listing (3.5k with every skill found, 0.1k with two). Memory files (CLAUDE.md files found up the directory tree) add the rest.

## Making it smaller

1. **List your skills**: `skills: ["my-agent:a", "my-agent:b"]`. The SDK's own and unrelated skills are no longer listed. Slash commands keep working. See [Skills and plugins](../capabilities/skills-and-plugins.md#choosing-which-skills-the-agent-offers).
2. **Load no settings files** when your plugin brings everything: `settingSources: []`. The CLAUDE.md files of parent folders (a repository's developer instructions, say) stop being sent.
3. **Grant only the tools you need**: no file tools without a knowledge or sources folder, no `Agent`/`Bash` without subagents. `disallowedTools` removes a tool the configuration would otherwise get.
4. **Keep the prompt short** and move rarely needed detail into skills, which are only loaded when they apply.
5. **Use subagents for noisy work**: a subagent's searches and page reads stay in its own context; only its answer reaches the main one. Use a smaller `model` for them.

## Watching it

The Ink chat's status bar shows the session's input and output tokens and how full the context window is (`context 8%`) after each turn. From code:

```ts
const run = runQuery(input, options);
// …after a turn:
const usage = await run.contextUsage(); // { percentage, totalTokens, maxTokens } or null
```

Each `turn-end` event carries the session's cumulative usage (`inputTokens` including cache reads and writes, `outputTokens`, and an estimated `costUsd`). See [Events](../advanced/events.md).

## Long conversations

`autoCompactEnabled` is on by default: when the context fills up, the CLI compacts the conversation into a summary and goes on. Turn it off with `buildSessionOptions(config, runDir, spec, { autoCompactEnabled: false })` if you'd rather have the session fail than lose detail.
