---
sidebar_position: 4
title: Configuring
description: An installed extension's settings - declared by its author as Claude Code's userConfig, asked when it's installed, changed with extension config, /extensions config or a settings form, kept apart when secret, and applied to a running session.
---

# Configuring an extension

An extension that needs values from the person (their city, a site's address, a token) declares them as **options**, and the person gives them once. How an author declares them is in [Writing one](writing.md#3-its-settings); this page is what happens to them.

## The two sides

- **The author declares** them in the extension's `plugin.json`, under `userConfig`, exactly as Claude Code does, and their servers take them as `${user_config.KEY}` in their `args` and `env`. The same folder works in Claude Code, which asks for them itself and keeps them in its own settings.
- **The person gives the values**, through the agent:

| Where | How |
| --- | --- |
| 📦 When it's installed | `my-agent extension add weather@ada` asks for each option without a value, on a terminal (a secret without echo). `--set city=Madrid` gives one without asking (a script). |
| ⌨️ Later, from a shell | `my-agent extension config weather` shows them; `extension config weather units=imperial` sets one; `extension config weather token` asks for it, without echo when it's a secret; `--unset <key>` clears one. |
| 💬 In the chat | `/extensions config weather` shows them; `/extensions config weather units=imperial` sets them and restarts the extension's servers in the same conversation. Never a secret: what's typed in a chat is kept in its history. |
| 🖥️ In a desktop or web agent | A settings form made from its options, each by its type (text, number, a choice, a checkbox), a secret as a password field that's never filled back. Captain Whiskers' drawer has it; a host of your own builds it from the chat controller's `extensionOptions(name)` and saves with `setExtensionOptions(name, values)`, secrets included. |

```console
$ my-agent extension config weather
  city = Santa Cruz de Tenerife  (Your city, required)
  units = metric (default)  (Units)
```

## What the values do

- **A required option without a value** (nor a default) keeps the extension off, saying which and how to set it: `needs city (Your city) set: extension config weather city=<value>`.
- **Values are checked by type**: a number within its `min` and `max`, one of its `options` when it has them, `true`/`false` (or `yes`/`no`) for a boolean, several comma-separated for a `multiple` one, an absolute path for a `directory` or `file`.
- **Values reach the server as text**: a boolean as `true` or `false`, a list comma-separated, one without a value as empty.
- **Reinstalling or updating keeps them**; removing the extension deletes its secrets.

## Where they're kept

Never in the prompt, the transcript or a tool's result:

- **Non-sensitive values** in the scope's lock entry (`options`). In a [workspace](workspaces.md), that's the project's lock, so the people who share the project share them too (a team's Moodle sites, say).
- **Secrets** (`sensitive: true`) in the scope's private folder, `.secrets/<name>.json`: the agent's scope's own, or, for a workspace's extension, in the agent's folder, never in the project. No session's file tools reach it, even when the scope's folder is readable.

## Changing them while a session runs

The kit's launcher reads the values when it starts a server, so a change reaches the server when it starts again:

- **From the chat** (`/extensions config`, or a settings form), the extension's servers restart in the same session (`reconnectMcpServer()`: a new process with the values as they are now), and the model is told with the next message. A call running at that moment fails.
- **From another terminal** (`extension config`), the change applies when its server starts again: a new session, or `/extensions disable` and `enable` in the chat.
- A session the agent builds itself gets `restartExtension(name)` from `buildSessionOptions()`, which returns `false` when it can't be done in that session.
- **A [remote server](writing.md#a-remote-server)'s options** go into its URL and headers when the session opens, and restarting it wouldn't change them: changing one opens the session again, keeping the conversation (`restartExtension()` returns `false` for it).

## Guided mode's answers

In guided mode the kit asks the person before an installed extension's tool that changes things, and some answers last: "Yes, always" and "No, never" ([Extensions' tools that change things](../human-in-the-loop/approvals.md#extensions-tools-that-change-things)). They're kept next to its options, in its scope's lock entry (`confirm`), and survive updates. The person, never the model, changes them:

```
/extensions config canva                 # its options, then what guided mode keeps for it
/extensions config canva confirm=reset   # forget "always" and "never": its tools ask again
/extensions config canva confirm=off     # its tools run without asking (an extension you trust)
/extensions config canva confirm=on      # ask again
```

The same with `extension config` from the terminal. The gate reads them on each call, so a change applies at once, without restarting anything; a tool said "never" stays out of the running session until the next one.

## What isn't configuration

What the server learns or creates while it works (a signed-in browser session, a cache, sites added by asking it) isn't an option: the server keeps it in its [data folder](writing.md#its-data), which survives restarts, reinstalls and updates. And variables of the agent's own (`${VAR}` in a server's `env`, from the agent's environment) reach a server only when its `.mcp.json` names them.
