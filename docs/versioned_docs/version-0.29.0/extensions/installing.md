---
sidebar_position: 3
title: Installing and the catalog
description: Where an agent installs extensions (its scopes and their locks), the extension command, marketplaces and their trust, the catalog in the chats (topics, logos, catalogTopics, the official marketplace), /extensions, and turning extensions on and off in a running session.
---

# Installing and the catalog

This page is for whoever builds an agent and lets its users install extensions, and for those users. The extensions themselves are written as in [Writing one](writing.md).

## Scopes

An agent says where extensions are installed for it, in two **scopes**, like Claude Code's plugins:

```ts
const config: Config = {
  // …
  extensionDirs: {
    agent: path.join(os.homedir(), ".my-agent", "extensions"), // for all its projects
    project: path.join(projectDir, "extensions"), // for this one: it wins over the agent's
  },
  officialMarketplace: "falkenslab/agent-extensions", // optional: its own marketplace
  catalogTopics: ["my-agent"], // optional: what its catalog offers
};
```

Each scope has a lock, `extensions.lock.json`: where each extension came from (a folder, a git URL and the commit it was cloned at, a marketplace), a SHA-256 over its files, whether it's enabled and its options. The agent's scope keeps each one's code in a subfolder of its own; a project's keeps only its lock (see [Workspaces](workspaces.md)). Either scope may be left out: an agent whose home is its only project (Captain Whiskers) has just `agent`.

Every enabled one runs with the session, alongside the internal ones and resolved the same way ([capabilities](overview.md#capabilities), the Extensions section of the prompt), unless something keeps it off; the prompt and `/extensions` say why. The reasons are listed in the [reference](reference.md#why-an-extension-is-off).

## The command

Each agent exposes the kit's command in its own binary, so the person needn't know the kit:

```ts
import { runExtensionCommand } from "@falkenslab/agent-kit";

// Before anything else: `my-agent extension add …` does that and exits.
if (await runExtensionCommand(process.argv.slice(2), { dirs: extensionDirs, command: "my-agent", official: officialMarketplace, catalogTopics: ["my-agent"] })) process.exit();
```

`official` (the agent's own [marketplace](#marketplaces)) and `catalogTopics` (what `search` offers) are optional.

| Command | What it does |
| --- | --- |
| `extension list` | What's installed: name and version, scope, enabled or not, author, where from. |
| `extension info <name>` | Everything its manifest says (description, author, license, homepage, repository, keywords, the agent-kit versions, capabilities, servers, read-only tools, options, packages, variables), how it was installed, its data folder and its size, and where its README is. |
| `extension add <folder>` | Copies the folder into the agent's scope, checks its manifest, hashes it and locks it, enabled. It says what it [needs](writing.md#programs-it-needs) and this computer lacks, and how to install it; it never installs a program. |
| `extension add <git URL>[#ref] [--path <subfolder>]` | Clones the repository at the ref (`https://…`, `git@…`, `file://…`, `github:owner/repo`) and records the commit. |
| `extension add <name>[@<marketplace>]` | Installs an extension of a known [marketplace](#marketplaces), from wherever the marketplace says; `@<marketplace>` only when two offer that name. One from a marketplace that isn't the agent's own asks first. |
| `extension add <folder> --link` | Registers the folder where it is, to [develop it](developing.md): not copied, its files not checked. `list` shows it as linked. |
| `extension add … --project` | Into the project's scope instead (its code goes to the agent's store: see [Workspaces](workspaces.md)). |
| `extension add … --set <key>=<value>` | Gives one of its [options](configuring.md) (as many `--set` as needed), saved before anything else is asked. Those not given are asked on a terminal; with `--yes`, or without a terminal, none is asked: a default stays, an optional one stays unset, and a required one leaves the extension off until it's set (`extension config`). |
| `extension remove <name>` | Removes it and its lock entry (a linked one's folder stays where it is). When it has [data](writing.md#its-data), asks whether to delete it too: `--yes` deletes it, `--keep-data` keeps it. |
| `extension enable <name>` | Turns it on. |
| `extension disable <name>` | Turns it off, keeping it installed. |
| `extension config <name>` | Its [options](configuring.md) and their values (a secret only says whether it's set). |
| `extension config <name> <key>=<value>…` | Sets them. `<key>` alone asks for its value, without echo for a secret (so it stays out of the shell's history); `--unset <key>` clears one. |
| `extension config <name> confirm=on\|off\|reset` | Whether guided mode asks before its tools that change things (`off`: they run without asking), or `reset` to forget the answers kept ("always", "never"). See [Guided mode's answers](configuring.md#guided-modes-answers). |
| `extension update [name]` | Updates one installed from a marketplace to the version it offers now (a fresh copy of the marketplace first), or every one with a newer version without a name; its data and options are kept. One installed from a folder or a repository is updated by adding it again. |
| `extension restore [--trust]` | Gets the code a workspace's lock lists and this computer lacks ([Workspaces](workspaces.md)); `--trust` trusts it too. |
| `extension trust [name…]` | Lets the workspace's extensions (or those named) run, as their code is now. |
| `extension search [words]` | What the known marketplaces offer (only `catalogTopics`' when given), matching the words in a name, description or topic; installed ones are marked, with their update when there's one. |
| `extension marketplace add <folder \| git URL[#ref] \| owner/repo>` | Adds a marketplace after a warning and typing its name (`--yes` for a script). |
| `extension marketplace list` | The known marketplaces: the official one marked, how many extensions each offers, where from and when it was copied. |
| `extension marketplace update [name]` | Takes a fresh copy of one, or all; installed extensions stay as they are until updated. |
| `extension marketplace remove <name>` | Forgets it; the extensions installed from it stay. |

Without a scope, `remove`, `enable` and `disable` act where the extension is (in both: say which, `--project` or `--agent`). Installing never runs a script: a repository's install scripts, if any, don't run. `--yes` answers the command's questions; without a terminal, they're answered no.

## Marketplaces

A repository of extensions is a [Claude Code marketplace](https://code.claude.com/docs/en/plugins/marketplace-reference) as it is: a folder or git repository with `.claude-plugin/marketplace.json` listing its extensions and where each comes from. The same file serves Claude Code and agents on the kit. How to make one is in [Publishing a marketplace](publishing.md); the sources an entry may name are in the [reference](reference.md#marketplace-sources).

An agent knows the marketplaces added to it, in its agent scope (the project's when it has none): `marketplaces.json`, and a copy of each in `.marketplaces/<name>/`. Installing from one goes through the same copy, hash and lock as any extension, with its name there recorded (`weather@ada`, shown by `extension list`). Trust follows [ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md):

- **The agent's own marketplace** (`official` in the command, `officialMarketplace` in the config) is known without asking, and its extensions install without a question. A folder is copied afresh every time it's looked at, since it's the agent's own code; a git one is copied once and refreshed with `marketplace update`.
- **Any other** is added only by hand: the command shows its name, owner and how many extensions it offers, warns that they run with the person's permissions, and asks to type its name. Installing from it shows the extension and asks again.

The functions behind the command are exported too, for a host with its own interface: `addMarketplace()`, `inspectMarketplace()` (read one without adding it), `listMarketplaces()`, `updateMarketplace()`, `removeMarketplace()`, `findPlugin()`, `installFromMarketplace()`, and the catalog's `extensionCatalog()`, `installExtension()` and `updateExtension()`. They ask nothing: asking the person is the host's.

## The catalog

What the agent's marketplaces offer is its catalog, in the command (`search`, `add`, `update`) and in the chats, so a person without a shell (a desktop app) installs and updates extensions too.

- **What it lists**: each extension with its description in the kit's language (its own there, else the English), the version it offers (its `plugin.json`'s, which wins over the marketplace's entry, as in Claude Code), whether it's installed, whether one installed from that marketplace has a newer version there, its **topics**, its **look**, what it lets the agent do (its [capabilities](overview.md#capabilities), in the kit's language, which the search matches too), the programs it [needs](writing.md#programs-it-needs) on the computer ("Needs Docker") and the hosts its [remote servers](writing.md#a-remote-server) talk to.
- **Topics**: what it's about and who it's for, from Claude Code's own fields: its `plugin.json`'s `keywords`, and its marketplace entry's `tags`, `keywords` and `category`, lowercased. An audience is a topic like any other (`"miyagi"`), and the search matches topics too.
- **What an agent offers**: `catalogTopics` in its config keeps its chats' catalog, and `extension search`, to the extensions with one of them; without it, every one. What's already installed is listed whatever its topics, and updates the same.
- **Its look**: a `logo` (square) and a `banner` (wide), which the extension declares ([Writing one](writing.md#6-its-look-in-a-catalog)). The catalog gives them as files of the marketplace's copy; a host serves them to its page (the chat controller's `extensionImage(spec, kind)`).
- **Installing** puts it in the agent's scope, enabled; the running session is untouched, so the conversation going on isn't changed under it. It's there in a new conversation, or now: `/extensions reload` (the controller's `reopen()`) opens the session again with it, keeping the conversation.
- **Updating** takes a fresh copy of its marketplace and installs it again in the same scope, its data and options kept.
- **Uninstalling** turns it off in the running session first, and deletes its data only when asked.

Captain Whiskers' web and desktop app show it as a drawer with two tabs: the installed ones (on, off, settings, update, uninstall) and the catalog as a grid of cards (logo, name, version, description, topics), with a search, topic chips to filter, and a card opening its details with its banner. In a host of your own, the chat controller's `extensionCatalog()`, `extensionImage()`, `installExtension()`, `updateExtension()`, `removeExtension()`, `extensionOptions()`, `setExtensionOptions()` and `reopen()` do it (see [Custom hosts](../advanced/custom-hosts.md)).

## The agent's own suggestions

People won't know which extensions exist unless their agent tells them. With [awareness](../capabilities/awareness.md) and a folder for extensions, the agent has `extensions_catalog`, a read-only tool that answers three things apart:

- **Installed here**: each extension in its scope, running or off (and why), what it lets the agent do, and the options it still needs.
- **Offered by the catalogs**: what the known marketplaces offer, from their copies on this computer (instant, no network), each with the age of its copy; only what has one of the agent's `catalogTopics`, and only what matches the words the agent looks for.
- **What's new online**: with `refresh`, the catalogs are fetched again first, and it names extensions published since the last copy and newer versions of installed ones. At most once per marketplace and session; without network, it answers from the copies and says so. Refreshing renews the catalogs' copies, never what's installed.

The prompt tells the agent when to use it: when a request is something its tools don't do well, it looks for an extension and, if one fits, suggests it in one sentence (what it adds, what it needs, `/extensions install <name>@<marketplace>`) and goes on with what it can do without it. It never installs, enables or configures one itself, and doesn't suggest one again in a conversation once the person declines it. Asked what extensions it has, how to set one up or why one is off, it answers from the tool and its `extensions` skill. A miyagi asked to grade a Moodle assignment without Moodle suggests `moodle-teacher`, and a padawan asked what's due `moodle-student`: each one's `catalogTopics` keep it to its own.

## In the chat

`/extensions` works in both chats:

| Command | What it does |
| --- | --- |
| `/extensions` | What the session runs with and what each lets the agent do (its [capabilities](overview.md#capabilities), in the person's language, with any tool its server doesn't offer, and any that needs a program this computer lacks), what's off and why, and what's installed. |
| `/extensions enable <name>`, `/extensions disable <name>` | Change the lock and apply it, in the same session when it can be. |
| `/extensions config <name> [key=value…]` | Its [options](configuring.md), and setting them (never a secret: what's typed in a chat is kept in its history). |
| `/extensions search [words]` | The [catalog](#the-catalog). |
| `/extensions install <name>` | Installs one (`--yes` for one from another marketplace, after reading what it says). |
| `/extensions update [name]` | Updates one, or all that have a newer version. |
| `/extensions remove <name>` | Uninstalls one (`--delete-data` to delete its data). |
| `/extensions reload` | Opens the session again with what's installed now, keeping the conversation. |
| `/extensions sign-in <name> [address]` | Signs in to its [remote servers](writing.md#a-remote-server) behind OAuth: opens the sign-in page in this computer's browser and shows the link too, and says when it's done; with the address a browser on another computer ended on, finishes it. `/extensions` lists who needs it. |
| `/extensions sign-out <name>` | Signs out of its remote servers. |
| `/extensions trust` | Trusts the [workspace's](workspaces.md) extensions; a session that opens with some untrusted asks first. |

The chat must have a session opener (`runChatInk()` with one, or the chat controller with one) to apply a change.

## Turning one on and off while a session runs

**In the same session** when the extension was running when the session opened: its MCP servers are switched off (their tools leave the model's context) and its plugin is unloaded (its skills, commands and subagents go), and back again on `enable`. The kit's gates, the chat's labels, the commands, `/extensions` and [awareness](../capabilities/awareness.md)'s `about_me` follow, and the model is told with the person's next message, since the prompt's Extensions section still says what the session opened with. To do it, each session loads an installed extension's plugin through a link in the run's folder (`<runDir>/extensions/<name>/`, a junction on Windows), which it removes and makes again: nothing is copied, however large the extension, and what's installed is never touched. Where a link can't be made (a disk without them), it's a copy, emptied and filled.

**By opening the session again**, keeping the conversation, otherwise: an extension that wasn't running when the session opened (installed since, or enabled in the lock), or whose files changed since it was installed (a new session judges them by their hash; a [linked](developing.md#linking-it) one's aren't checked, so it turns on again with its new files).

A session the agent builds itself gets the same switch from `buildSessionOptions()`'s `switchExtension(name, enabled)`, which returns `false` when it takes a new session; it needs the session running through `runQuery()`.

**When it's turned off**, or the session closes, its servers end, with every process they started: a browser Playwright opened ends too, and its profile isn't left locked for the next start (confirmed empirically on Windows: the SDK's CLI ends a server's whole process tree).
