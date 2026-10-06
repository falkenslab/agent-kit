---
name: agent-help
description: How to use this agent - its chat's modes, keys and slash commands, resuming an earlier conversation, approvals and questions, the command line, and the agent's own commands and configuration. Load it whenever the person asks how to do something with you, what a key or command does, or what you can do.
---

# Helping the person use you

Answer from this page only: the chat's part below is the same for every agent built on agent-kit, and the "This session" and "This agent" sections at the end are about you. If something isn't covered here, say you don't know rather than inventing a key, command or option. Answer in the language you reply in, briefly, with the exact key or command; keys and commands are typed as written here, whatever the language.

## Modes

How much you ask before acting. The current one is in the status bar, below the prompt.

- **interactive**: asks before every single action (each tool call), with the tool and its parameters.
- **guided**: asks only before something hard to undo or visible to others (publishing, sending); everything else runs on its own.
- **autonomous**: never asks; there's nobody to ask. A session that starts autonomous stays autonomous.
- **plan**: only reads and plans, changing nothing, until the plan is approved. The plan comes as a panel: **Run it** (leaves plan mode and carries it out), **Keep planning** (with a comment on what should change) or **Cancel**.

`Shift+Tab` switches to the next mode the session allows (guided, interactive, plan, in a loop). `/plan` turns plan mode on, and off again back to the mode it came from.

## Approvals and questions

- **An approval** shows what is about to happen: **Yes** to go on, **No** to refuse that one action (the agent tries something else), **Stop** to stop it altogether.
- **A question** with options: `↑`/`↓` and `Enter` to choose, `Space` to mark when several can be chosen, or **Other** to type your own answer. A free question: type the answer and `Enter`, or `Esc` for no answer.
- **A request for a file**: drag the file onto the terminal (or type its path) and `Enter`, or just `Enter` if you don't have it.
- **A manual step** (signing in by hand, for an agent that drives a window): do it, then **Done, continue**.
- In interactive mode every action asks; switching to guided with `Shift+Tab` stops that.

## Keys

- `Enter` sends the message; `\` then `Enter`, or `Ctrl+J`, starts a new line.
- `Tab` completes a `/command`, or takes the grey suggestion.
- `↑`/`↓` go through earlier messages; `Ctrl+R` searches them. `↑` on an empty prompt edits the last message still waiting to be sent.
- `Ctrl+W` deletes a word, `Ctrl+K` to the end of the line, `Ctrl+U` the whole line; `Ctrl+←`/`Ctrl+→` move by word.
- `@` mentions a file, with completion.
- `?` on an empty prompt shows the shortcuts.
- `Esc` interrupts the agent's turn; `Ctrl+C` interrupts it, or leaves at an empty prompt.
- `Ctrl+O` unfolds (and folds again) the tool calls; the task list of a long job stays on screen while it runs.
- `PgUp`/`PgDn` or the mouse wheel scroll; `Ctrl+End` goes back to the bottom. In full screen, drag to select and right-click to copy.

Messages typed while the agent works are queued and sent when it finishes.

## Commands

- `/exit` or `/quit`: leave the chat (an agent can name its own exit commands instead).
- `/copy`: copy the last reply to the clipboard.
- `/resume`: pick an earlier conversation to go on with (`↑`/`↓`, `Enter`, `Esc` to cancel), where the agent keeps its conversations.
- `/plan`: plan mode on or off (see Modes).

Typing `/` and `Tab` lists every command, the agent's own included (named `/plugin:command`). An unknown `/command` isn't sent.

## Command line

- `--continue`: start with the latest conversation instead of a new one.
- `--language=<code>`: the language of the chat and of the replies: `en`, `es`, `fr` or `de`. Without it, the agent's configured one, or the system's.

Some agents use a simpler line-by-line chat that has only part of this (no full screen, no `/copy`).
