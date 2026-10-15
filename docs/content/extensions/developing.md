---
sidebar_position: 7
title: Developing and testing
description: Trying an extension while you build it - linking it into an agent, seeing it work, why it's off when it is, validating it, versioning it, and keeping it working in Claude Code too.
---

# Developing and testing

## Linking it

While you build an extension, link it into an agent instead of installing it:

```bash
my-agent extension add ./weather --link --set city=Madrid
```

The agent runs it from that folder: its files aren't copied, nor checked against a hash, and `extension list` shows it as linked. Rebuild it (`npm run build`) and the change takes effect when its server starts again: a new session, or `/extensions disable weather` and `/extensions enable weather` in the chat, which turns a linked extension back on with its new files. `extension remove weather` only forgets it; the folder stays.

Captain Whiskers is a ready agent to try one in: from an agent-kit checkout, `npm run build` at its root, then in `examples/captain-whiskers` `npm start -- extension add <folder> --link`, and `npm start` (or `npm start -- --web`).

## Seeing it work

| Check | How |
| --- | --- |
| 📋 It's installed, with its settings | `my-agent extension info weather`: its servers, its read-only tools (`what its servers mark readOnlyHint`), its options; `extension config weather` for their values. |
| ✅ It's running | `/extensions` in the chat lists it among what the session runs with, or says why it's off. |
| 🧰 Its skills and commands | Typing `/` in the chat lists `/weather:today`; the agent's `about_me` lists its skills. |
| 🔧 Its tool | Ask the agent ("what's the weather today?"): the chat shows its label, `Checking the weather in Madrid`. |
| 🔒 Plan mode | Switch to plan mode (`/plan`): `forecast` still runs, a tool that writes is denied. |
| 🧪 Its server alone | Run `dist/server.mjs` with its variables and send it MCP over stdin, or use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) (`npx @modelcontextprotocol/inspector node dist/server.mjs`). |

## When it's off

The chat's `/extensions`, the prompt and `extension list` say why an extension doesn't run. The common reasons while developing:

- **`needs city (Your city) set`**: a required option without a value: `extension config weather city=…`.
- **`runs its server "weather" with "python"`**: only Node or npx servers run ([Its servers](writing.md#its-servers)).
- **`has no script at dist/server.mjs`**: build it first.
- **`names ${user_config.x}, which its userConfig doesn't declare`**: a typo between `.mcp.json` and `userConfig`.
- **`has files that changed since it was installed`**: an installed (not linked) copy was edited; install it again.
- **`works with agent-kit >=0.23.0`**: its `kit` range excludes this agent's kit.

Every reason is in the [reference](reference.md#why-an-extension-is-off).

## Validating

```bash
claude plugin validate --strict .
```

Claude Code 2.1.271 or later (fixed values in `userConfig`, `options`, need it). `--strict` fails on any warning, so a field in the wrong place (agent-kit's data outside `metadata`) or a version that doesn't match its marketplace entry fails too. For agent-kit's own data, `schemas/agent-kit-metadata.schema.json` in `@falkenslab/agent-kit` checks `metadata["agent-kit"]`: point your editor's JSON schema setting at it, and [agent-kit-catalog](publishing.md#the-catalog-file) checks it when it builds the catalog.

## Versioning

- **`version` in `plugin.json`** is the extension's version: Claude Code and agent-kit both show it, compare it to offer updates, and Claude Code caches by it. Raise it with every change you publish, and keep its marketplace entry's `version` the same.
- **`kit`** in `metadata["agent-kit"]` says which agent-kit versions it works with (`">=0.22.0"`). Leave out an upper bound unless a version is known to break it: one turns the extension off with the kit's next minor release until it's raised.
- **A server from npm** is pinned in `.mcp.json` (`@falkenslab/moodle-mcp@0.3.0`); raising it is a new version of the extension, with any skill that depends on it.

## Line endings

The kit checks an installed extension's files by a hash that ignores text files' line endings, so a repository checked out with CRLF on Windows and LF elsewhere installs the same. Still, keep a marketplace's files in LF (a `.gitattributes` with `* text=auto eol=lf`): Claude Code and other tools compare them as they are.

## Working in Claude Code too

The same folder is a Claude Code plugin: `claude plugin marketplace add <marketplace>` and `claude plugin install weather@<marketplace>`, and Claude Code asks for its `userConfig` itself. What's agent-kit's only (`metadata["agent-kit"]`: labels, help, the catalog's look, capabilities, read-only lists) is ignored there; its server's `instructions`, its skills and commands work the same. Claude Code also runs a plugin's hooks, which the kit never does: rules that must always hold belong in the server.
