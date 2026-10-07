---
sidebar_position: 7
title: Memory of the person
description: The memory extension - what the agent learns about the person it works for, kept across all their projects in a folder of its own, only from what the person says.
---

# Memory of the person

The `memory` [extension](extensions.md) gives the agent a memory of the person it works for: who they are (their name, their role) and how they want things done (their corrections, how they like answers). It lasts across sessions and across **all their projects**, which a project's [knowledge base](knowledge-base.md) can't: padawan learning how a student studies, course after course; miyagi learning a teacher's style.

## Turning it on

```ts
import os from "node:os";
import path from "node:path";

const spec: AgentSpec<Config> = {
  // …
  extensions: ["memory"], // with others: ["sources", "knowledge", "memory"]
};

const config: Config = {
  // …
  memoryDir: path.join(os.homedir(), ".miyagi", "memory"),
};
```

- `memoryDir` is a folder of the agent's own, **outside any project**. Without it, the extension is left out and the agent can tell why.
- **Never share it between agents.** Different agents work for different people, or the same person in different roles, and what suits one spoils another. A shared memory would also be a way for an instruction planted in one agent to reach the others.
- One memory per agent and per user of the computer. If the agent works with several accounts and wants one memory for each, it puts the account in the path (`~/.miyagi/memory/<account>`).

## What the agent sees

Its prompt section lists what it remembers, one line per entry, the most recently saved first (up to 50; past that, the line says how many are left out and `memory_list` gives them all):

```text
## Your memory of the person
You keep a memory of the person you work for, across all their projects: …
- no-fish-puns (feedback): Dislikes puns about fish; avoid fish-themed jokes
- preferred-name-fran (user): Wants to be called Fran
```

Then its rules:

- Apply what it remembers without being asked.
- Save when the person corrects it, says how they like things done, or tells it something about themselves that will matter again, and say so in a few words ("I'll remember that"). It doesn't ask first. If an entry already covers it, update that entry instead of adding another.
- Keep only what's about the person wherever they work. How to do this project's work goes in the project (the knowledge base's [preferences](knowledge-base.md#the-persons-preferences)), and what only this task needs goes nowhere.
- Write the entries in the language it replies in.

## The tools

| Tool | What it does |
| --- | --- |
| `memory_list` | Every entry: name, type and description. Read-only. |
| `memory_read` | One entry, whole. Read-only. |
| `memory_save` | Creates an entry, or replaces the one with the same name: `name` (kebab-case), `type` (`user` or `feedback`), `description` (one line), `body` (for `feedback`, the rule, why and how to apply it) and `quote`. |
| `memory_forget` | Forgets an entry. |

**Only what the person said.** `memory_save` checks that its `quote` appears in a message the person wrote in this conversation, ignoring case, spacing and quote marks. Otherwise it saves nothing and tells the model why. The extension hears the person's messages with a `UserPromptSubmit` hook (and, in a resumed run, reads the earlier ones from the run's conversation). A document, a web page or a tool result that says "remember that the person wants…" can't put anything in the memory, however it's worded.

The file tools never reach the folder (the denial points to the `memory_*` tools), and in [plan mode](../core-concepts/modes.md#plan) only the read-only tools work.

## Commands for the person

| Command | What it does |
| --- | --- |
| `/memory:list` | Shows everything the agent remembers about them, by type. |
| `/memory:forget <entry>` | Forgets an entry, by name or description. |

Saying it in plain words works too ("forget that I don't like puns"). With an [identity](../core-concepts/agent-spec.md#identity-and-helpguide), `agent-help` tells the person the memory exists and how to see it.

## On disk

One markdown file per entry, `<memoryDir>/<name>.md`, like Claude Code's auto-memory (which the kit keeps off, since it belongs to the runner and is per folder):

```markdown
---
name: no-fish-puns
description: Dislikes puns about fish; avoid fish-themed jokes
type: feedback
updated: 2026-10-07T13:15:05.678Z
---

Rule: never tell jokes or puns about fish to this person. Why: they said "I can't stand puns about fish." Apply: …
```

Deleting a file forgets that entry; deleting the folder forgets everything.
