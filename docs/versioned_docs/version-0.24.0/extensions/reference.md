---
sidebar_position: 9
title: Manifest reference
description: Every field an installed extension's files may carry - plugin.json's Claude Code fields, userConfig options, metadata["agent-kit"], .mcp.json's substitutions, marketplace sources - the lock, where the kit keeps things, the schemas, and why an extension is off.
---

# Manifest reference

## plugin.json

`.claude-plugin/plugin.json`, in [Claude Code's format](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema). The fields the kit reads:

| Field | What it is |
| --- | --- |
| `name` | Kebab-case. Its name in the agent: its tools are `mcp__<server>__<tool>`, its skills and commands `<name>:<…>`. |
| `version` | Its version: shown, compared for updates, and the same as its marketplace entry's. |
| `description` | One sentence; the prompt's Extensions section and the catalog show it. |
| `author` | `{ name, email?, url? }` (an object: a string fails validation). |
| `homepage`, `repository`, `license` | Shown by `extension info`; `repository` may be a URL or `{ url }`. |
| `keywords` | Its topics in a catalog. |
| `userConfig` | Its options ([below](#userconfig)). |
| `mcpServers` | Its MCP servers inline, or a path to a JSON file; else `.mcp.json` at its root. |
| `metadata` | Free-form data Claude Code doesn't read: agent-kit's goes under `"agent-kit"` ([below](#metadataagent-kit)). |

Skills (`skills/<name>/SKILL.md`), commands (`commands/<name>.md`) and subagents (`agents/<name>.md`) load as in Claude Code. Its hooks never run in the kit.

## userConfig

Each key (letters, digits and `_`) is an option; Claude Code's format, strict: any other field leaves the extension off, as Claude Code refuses it.

| Field | What it is |
| --- | --- |
| `type` | `string`, `number`, `boolean`, `directory` or `file`. Required. |
| `title` | What it's called where the person is asked. |
| `description` | What it is, for the person. Required. |
| `required` | Without a value (nor a default), the extension is off. |
| `default` | Its value until the person gives one. |
| `sensitive` | A secret: asked without echo, kept apart, never shown back, never set from a chat. |
| `options` | The values it may take (a `string`; not with `multiple` or `sensitive`). Needs Claude Code 2.1.271 or later. |
| `multiple` | Several values, comma-separated where they're typed, joined with commas for the server. |
| `min`, `max` | A number's bounds. |

## metadata["agent-kit"]

All optional; checked by `schemas/agent-kit-metadata.schema.json`.

| Field | What it does |
| --- | --- |
| `kit` | The agent-kit versions it works with: comparators separated by spaces, all of which must hold (`>=0.22.0`, `>=0.22.0 <0.24.0`, `0.22.1`). Outside them, it's off. Leave out an upper bound unless a version is known to break it. |
| `description` | Its description in other languages: `{ "es": "…", "fr": "…", "de": "…" }`. English is `plugin.json`'s own `description`; where the person's language is missing, they read the English. |
| `provides`, `requires` | Its [capabilities](overview.md#capabilities), by name. |
| `capabilities` | What it lets the agent do, for the person: a list of `{ id, skills, tools, texts }`. `id` is kebab-case and counts as provided; `skills` are folders of its `skills/` (each must exist), `tools` short names of any of its servers; `texts` gives a `label` (required) and a `description` per language (`en`, `es`, `fr`, `de`), English where the person's is missing. |
| `requirements` | [Programs it needs](writing.md#programs-it-needs) on the computer, which the person installs: a list of `{ name, program, version?, install, for? }`. `program` is a bare name on the `PATH`; `version` is `{ args, min }`, its arguments options or `version` only; `install` has a command per system (`windows`, `macos`, `linux`) and a `url`; `for` names the capabilities that need it (none: the whole extension). Missing, the whole extension or those capabilities are off, saying how to install it. |
| `readOnlyTools` | Its tools that only read (short names, of any of its servers): plan mode lets them through. Without it, plan mode asks its servers (`readOnlyHint`); with it, the list is the whole answer, even empty. |
| `labels` | How the chat shows each tool (short name), per language (`en`, `es`, `fr`, `de`; English when the kit's isn't there): `label`, with `{field}` taking the call's input, and `phrase`, `[once, "{n} times"]`, for a [folded summary](../terminal-ui/tool-labels.md#folded-summaries). |
| `help` | What it says about itself in a session, for the agent to tell the person. |
| `catalog` | Its look: `logo` (square) and `banner` (wide), SVG, PNG, JPEG or WebP, paths inside its folder. |

## .mcp.json

As Claude Code reads it (or under `mcpServers` in `plugin.json`), with or without the `mcpServers` key. Each server: `command` (`node`, or `npx` with `-y` and `<package>@<x.y.z>`), `args`, `env`. In `args` and `env`:

| Placeholder | Becomes |
| --- | --- |
| `${CLAUDE_PLUGIN_ROOT}` | The extension's folder, wherever it's installed. Also given to the server as a variable. |
| `${CLAUDE_PLUGIN_DATA}` | Its [data folder](writing.md#its-data). Also given as a variable. |
| `${user_config.KEY}` | One of its options' value, read when the server starts. |
| `${VAR}` | The agent's own environment variable. |

## Marketplace sources

An entry's `source` in `.claude-plugin/marketplace.json`, as Claude Code has them; the kit installs:

| `source` | From |
| --- | --- |
| `"./path"`, or a bare name under `metadata.pluginRoot` | A folder of the marketplace itself; one that leaves it (`..`) is refused. |
| `{ "source": "github", "repo": "owner/repo", "ref"?, "sha"? }` | A GitHub repository, at a branch or tag, or a pinned commit. |
| `{ "source": "url", "url": "…git", "ref"?, "sha"? }` | Any git repository. |
| `{ "source": "git-subdir", "url": "…", "path": "…", "ref"?, "sha"? }` | A folder of a git repository. |
| `{ "source": "npm", "package": "@scope/name", "version"?, "registry"? }` | An npm package that is the extension: the version asked for (exact, a dist-tag, `latest` by default, or a range), its tarball checked against the registry's `integrity`. |
| `{ "source": "archive", "url": "https://….zip", "sha256"? }` | A zip over HTTPS, checked against `sha256` when given; the extension is its root, or its only folder. |

npm and zip downloads are fetched and unpacked in the agent's own process (no npm, no `tar`; unpacking takes the optional `fflate` library, see [Installation](../getting-started/installation.md#optional-libraries)), and nothing in them runs. `command` sources never install: they would run a program of the marketplace's on the person's computer.

## The lock

`extensions.lock.json` in each scope, by extension name:

| Field | What it is |
| --- | --- |
| `source` | Where it came from: a folder, a git URL (`#ref`), `npm:<package>@<version>`, a zip's URL. A linked one runs from there. |
| `commit`, `subdir` | The commit a git source was cloned at, and the folder inside it. |
| `marketplace` | `<name>@<marketplace>`, when it came from one. |
| `sha256` | A hash over its files (text files' line endings aside), checked before every session; empty for a linked one. |
| `linked` | Registered where it is (`--link`), its files not checked. |
| `stored` | Its code is in the agent's store (a workspace's): `<agent>/.store/<name>/<hash>/`. |
| `packages` | The npm packages its npx servers run: each one's integrity, hash and `bin`. |
| `options` | Its options' values that aren't secrets. |
| `enabled`, `installed` | On or off; when it was installed. |

## Where the kit keeps things

| Path | What |
| --- | --- |
| `<scope>/extensions.lock.json` | The scope's lock. |
| `<scope>/<name>/` | An extension's code, in the agent's scope (or a project's, when the agent has no scope of its own). |
| `<scope>/.data/<name>/` | Its data (`${CLAUDE_PLUGIN_DATA}`). |
| `<scope>/.secrets/<name>.json` | Its secrets; denied to the session's file tools. |
| `<agent>/.store/<name>/<hash>/` | A workspace's extensions' code, by content. |
| `<agent>/.projects/<project>-<hash>/` | A workspace's data and secrets. |
| `<agent>/.npm/<package>/<version>/` | The npm packages npx servers run. |
| `<agent>/marketplaces.json`, `<agent>/.marketplaces/<name>/` | The known marketplaces and their copies. |
| `<agent>/.trust.json` | What the person trusts, per workspace. |
| `<runDir>/extensions/<name>/` | A session's link to an extension's plugin. |

## Schemas

Shipped in `@falkenslab/agent-kit`, in `schemas/`:

- `agent-kit-metadata.schema.json`: `metadata["agent-kit"]` in a `plugin.json`.
- `marketplace-catalog.schema.json`: a marketplace's `catalog.json`.

## Why an extension is off

An enabled extension doesn't run, and the prompt and `/extensions` say why, when:

- its files changed since it was installed (its hash doesn't match): install it again to trust the change;
- it comes with a workspace and isn't trusted there yet, or its code isn't on this computer yet ([Workspaces](workspaces.md));
- its `kit` range excludes this agent's kit;
- a program it [requires](writing.md#programs-it-needs) for the whole extension isn't on the `PATH`, or is older than its `min` (one only some capabilities need keeps those off instead, and the extension runs);
- a requirement can't be checked safely (a program given as a path, a version argument that isn't an option) or is for a capability it doesn't provide;
- a server isn't Node or npx with an exact version, has no script where it says, or its npx package isn't in the cache;
- a server names `${user_config.KEY}` its `userConfig` doesn't declare, or a required option has no value;
- its `userConfig` has an option with an unknown field;
- a capability names a skill it doesn't have, or two have the same id;
- it requires a capability no enabled extension provides;
- an extension the spec enables has its name.
