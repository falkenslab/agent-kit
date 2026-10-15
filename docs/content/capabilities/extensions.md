---
sidebar_position: 4
title: Extensions
description: What an agent runs with besides the kit's core - the kit's awareness, knowledge base, sources and memory, extensions installed per agent or per project, and its own - how to enable and install them, capabilities, and how to write one.
---

# Extensions

An agent is the kit's core (the chat, the modes and their gates, subagents, the transcript, languages) plus the **extensions** it runs with. An extension is a Claude Code plugin (a manifest, skills, commands, subagents) plus what it brings to a session: its tools, what the model needs to know about them, which of its tools only read, how the chat shows them.

There are two kinds, managed the same way:

- **Internal**, shipped in a package: the kit's four (`awareness`, `sources`, `knowledge`, `memory`) and any an agent writes in its own code. They run in the agent's process, so they can use the kit's internals. The agent enables them in its spec.
- **Installed**, from a folder or a git repository, into the agent (for all its projects) or into one project. Any agent on the kit can use one. Its tools are its own MCP server, which the kit runs in a separate process with a clean environment. The person installs, enables and disables them.

## Enabling the internal ones

```ts
import { awareness, knowledge, memory, sources, type AgentSpec } from "@falkenslab/agent-kit";

const spec: AgentSpec<Config> = {
  // …
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }),
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
    memory({ dir: path.join(os.homedir(), ".my-agent", "memory") }),
    diceExtension,
  ],
};
```

- The kit's are made by their **factories**, each with its own options; an agent's own is **an object** (see [Writing one in your agent's code](#writing-one-in-your-agents-code)). Both are `Extension`s.
- A **folder option** (`dir`, a `FolderOption`) is a path, or a function of the session's config that returns one (or `undefined`): the spec is static, while the folders usually depend on the project. The factories are generic over the config type: `knowledge<Config>({ dir: (config) => config.courseDir })`.
- **None is on by default**, and only the spec's list turns one on: a folder belongs to the extension that names it.
- An extension the session lacks something for (its folder: "needs a folder (`dir`)") is **left out**, and so is one whose required capabilities nothing enabled provides (see [Capabilities](#capabilities)). The system prompt says which ones are off and why, so the agent can tell the person.

| Extension | Options | What it brings |
| --- | --- | --- |
| `awareness` | `awareness({ guide? })`: `guide`, the absolute path of a markdown guide to the agent's domain. Needs `identity` in the spec. | [Awareness](awareness.md): the "Who you are" prompt section, `about_me` (what the agent is right now, read from the session on every call, and its `guide`) and the `help` skill (how the kit's chat is used). Provides `self-awareness`. |
| `sources` | `sources({ dir, saveDescription? })`: `dir`, the originals' folder; `saveDescription`, the `save_to_sources` tool's description in the agent's words. | The originals: the sources tools (`list_sources`, `extract_text`, `save_to_sources`, `download_to_sources`, and `request_file`, `retire_source` outside autonomous mode), `Read`/`Glob`/`Grep` on the folder, never writing it, and its prompt section. See [Sources](knowledge-base.md#sources-originals-kept-as-obtained). Provides `sources`. |
| `knowledge` | `knowledge({ dir, pageTypes?, store? })`: `dir`, the knowledge base's folder; `pageTypes`, [your own page types](knowledge-base.md#your-own-page-types); `store(config, dir)`, [another store](knowledge-store.md). | The [knowledge base](knowledge-base.md): the `knowledge_*` tools over a store, its prompt section with the person's preferences, its skills and commands; the file tools never reach the folder. Provides `knowledge-base`. |
| `memory` | `memory({ dir })`: `dir`, a folder of the agent's own outside any project. | The [memory of the person](memory.md), across all their projects: its tools (`recall`, `remember`, `forget`), its prompt section with what it remembers, `/memory:list` and `/memory:forget`; saved only from what the person wrote. Provides `person-memory`. |

They own their data and never call each other: the model connects them through their tools (see [Knowledge base and sources](knowledge-base.md#knowledge-base-and-sources)).

## Installing extensions

An agent says where extensions are installed for it, in two **scopes**, like Claude Code's plugins:

```ts
const config: Config = {
  // …
  extensionDirs: {
    agent: path.join(os.homedir(), ".my-agent", "extensions"), // for all its projects
    project: path.join(projectDir, "extensions"), // for this one: it wins over the agent's
  },
};
```

Each scope has a lock, `extensions.lock.json`: where each extension came from (a folder, a git URL and the commit it was cloned at, a marketplace), a SHA-256 over its files, whether it's enabled and its options. The agent's scope keeps each one's code in a subfolder of its own. A project's keeps only its lock: see [A workspace's extensions](#a-workspaces-extensions). Every enabled one runs with the session, alongside the internal ones and resolved the same way (capabilities, the Extensions section of the prompt), unless:

- its files changed since it was installed (the hash doesn't match): install it again to trust the change;
- it comes with the workspace and the person hasn't trusted it there yet, or its code isn't on this computer yet (see [A workspace's extensions](#a-workspaces-extensions));
- its manifest says it works with other agent-kit versions (`kit`);
- a program it needs isn't on this computer's `PATH` (`needs`);
- its server isn't where its manifest says;
- an extension the spec enables has its name.

Then it's off, and the prompt and `/extensions` say why.

### A workspace's extensions

A project's scope travels with the project: a repository others clone, a folder someone sends. So it keeps only what's the workspace's, and the rest stays on each computer, in the agent's folder (when the agent has a scope of its own; without one, a project's scope keeps its code and data in it, as the agent's does).

- **The workspace keeps its lock**, `<project>/extensions/extensions.lock.json`: which extensions it uses, from where, at which version (the files' hash, the commit, the npx packages), and the options someone set that aren't secrets. Commit it with the project.
- **The code is in the agent's store**, `<agent scope>/.store/<name>/<hash>/`, by content: two workspaces with the same version share one copy, and one taken elsewhere carries no code.
- **The data and the secrets are in the workspace's private folder**, `<agent scope>/.projects/<project>-<hash>/` (`.data/<name>/`, `.secrets/<name>.json`): nothing private leaves with the project.
- **Restore**: on another computer, or another agent, a workspace's extensions are off, saying their code isn't there yet. `extension restore` gets each from where its lock says (its marketplace, its git repository at its commit, its folder), checks it against the lock's hash (which doesn't count text files' line endings, so a repository checked out with CRLF on one computer and LF on another matches), and fetches the npx packages it locks; what can't be got says why (a marketplace the agent doesn't know, another version there now, a folder that isn't on this computer).
- **Trust**: an extension that comes with a workspace runs code on this computer, so it runs only once the person trusts it in that workspace. The chats ask when the session opens (no by default; `/extensions trust` later); `extension trust [name…]` from a shell, and `extension restore --trust` both at once. What's trusted is each one's code, kept in the agent's folder (`.trust.json`), outside the project, so a project can't trust itself: another version (the lock changed, someone updated it) asks again; turning one on or off, or its options, don't. What the person installs or updates into the project's scope is trusted as they do it. The agent's own scope never asks.
- A session the agent builds itself reads the untrusted ones from `buildSessionOptions()`'s `extensions.untrusted`; `trustWorkspace(dirs)` and `restoreExtensions(dirs)` do the rest.

### The command

Each agent exposes the kit's command in its own binary, so the person needn't know the kit:

```ts
import { runExtensionCommand } from "@falkenslab/agent-kit";

// Before anything else: `my-agent extension add …` does that and exits.
if (await runExtensionCommand(process.argv.slice(2), { dirs: extensionDirs, command: "my-agent", official: officialMarketplace })) process.exit();
```

`official` is optional: the agent's own [marketplace](#marketplaces), a folder or a git URL.

| Command | What it does |
| --- | --- |
| `extension list` | What's installed: name and version, scope, enabled or not, author, where from. |
| `extension info <name>` | Everything its manifest says (description, author, license, homepage, repository, keywords, the agent-kit versions, capabilities, tools, variables), how it was installed, its data folder and its size, and where its README is. |
| `extension add <folder>` | Copies the folder into the agent's scope, checks its manifest, hashes it and locks it, enabled. |
| `extension add <git URL>[#ref] [--path <subfolder>]` | Clones the repository at the ref (`https://…`, `git@…`, `file://…`, `github:owner/repo`) and records the commit. |
| `extension add <plugin>[@<marketplace>]` | Installs a plugin of a known [marketplace](#marketplaces), from wherever the marketplace says (the marketplace's own folder, or a git repository at a ref or commit); `@<marketplace>` only when two offer that name. One from a marketplace that isn't the agent's own asks first. |
| `extension add <folder> --link` | Registers the folder where it is, to [develop it](#developing-one): not copied, its files not checked. `list` shows it as linked. |
| `extension add … --project` | Into the project's scope instead. |
| `extension add … --set <key>=<value>` | Gives one of its [options](#its-options) (as many `--set` as needed); those not given are asked, on a terminal. |
| `extension remove <name>` | Removes its files and its lock entry (a linked one's folder stays where it is). When it has [data](#its-data), asks whether to delete it too: `--yes` deletes it, `--keep-data` keeps it. |
| `extension enable <name>` | Turns it on. |
| `extension disable <name>` | Turns it off, keeping it installed. |
| `extension config <name>` | Its [options](#its-options) and their values (a secret only says whether it's set). |
| `extension config <name> <key>=<value>…` | Sets them. `<key>` alone asks for its value, without echo for a secret (so it stays out of the shell's history); `--unset <key>` clears one. |
| `extension update [name]` | Updates one installed from a marketplace to the version it offers now (a fresh copy of the marketplace first), or every one with a newer version without a name; its data and options are kept. One installed from a folder or a repository is updated by adding it again. |
| `extension restore [--trust]` | Gets the code a workspace's lock lists and this computer lacks, checked against the lock ([A workspace's extensions](#a-workspaces-extensions)); `--trust` trusts it too. |
| `extension trust [name…]` | Lets the workspace's extensions (or those named) run, as their code is now. |
| `extension search [words]` | What the known marketplaces offer, matching the words in a plugin's name, description, category, tags or keywords; installed ones are marked. |
| `extension marketplace add <folder \| git URL[#ref] \| owner/repo>` | Adds a marketplace after a warning and typing its name. |
| `extension marketplace list` | The known marketplaces: the official one marked, how many extensions each offers, where from and when it was copied. |
| `extension marketplace update [name]` | Takes a fresh copy of one, or all; installed extensions stay as they are until added again. |
| `extension marketplace remove <name>` | Forgets it; the extensions installed from it stay. |

Without a scope, `remove`, `enable` and `disable` act where the extension is (in both: say which, `--project` or `--agent`). Installing never runs a script: a repository's install scripts, if any, don't run. `--yes` answers the command's questions (a script); without a terminal, they're answered no.

### Marketplaces

A repository of extensions is a [Claude Code marketplace](https://code.claude.com/docs/en/plugins/marketplace-reference) as it is: a folder or git repository with `.claude-plugin/marketplace.json` listing its plugins and where each comes from. The same file serves Claude Code and agents on the kit, and `claude plugin validate --strict <folder>` checks it: the kit's data in a plugin is in `metadata`, which Claude Code doesn't read, so a marketplace's CI can fail on any warning.

```json title="extensions/.claude-plugin/marketplace.json"
{
  "name": "shipyard",
  "owner": { "name": "Falkenslab" },
  "metadata": { "description": "Captain Whiskers' own extensions." },
  "plugins": [
    { "name": "jokebook", "source": "./jokebook", "description": "Classic pirate jokes.", "tags": ["jokes"] },
    { "name": "cards", "source": { "source": "github", "repo": "falkenslab/cards", "ref": "v1.2.0" } }
  ]
}
```

The kit installs these sources:

| `source` | From |
| --- | --- |
| `"./path"`, or a bare name under `metadata.pluginRoot` | A folder of the marketplace itself; one that leaves it (`..`) is refused. |
| `{ "source": "github", "repo": "owner/repo", "ref"?, "sha"? }` | A GitHub repository, at a branch or tag, or a pinned commit. |
| `{ "source": "url", "url": "…git", "ref"?, "sha"? }` | Any git repository. |
| `{ "source": "git-subdir", "url": "…", "path": "…", "ref"?, "sha"? }` | A folder of a git repository. |
| `{ "source": "npm", "package": "@scope/name", "version"?, "registry"? }` | An npm package: the version asked for (exact, a dist-tag, `latest` by default, or a range such as `^2.0.0`), its tarball checked against the registry's `integrity` (sha512). |
| `{ "source": "archive", "url": "https://….zip", "sha256"? }` | A zip over HTTPS, checked against `sha256` when given; the plugin is its root, or its only folder. |

npm and zip downloads are fetched and unpacked in the agent's own process, so a packaged agent needs neither npm nor a `tar`, and nothing in them runs (an npm package's scripts don't); unpacking takes the optional `fflate` library (see [Installation](../getting-started/installation.md#optional-libraries)). A file that would land outside the plugin's folder is refused. `command` sources never install: they would run a program of the marketplace's on the person's computer.

An agent knows the marketplaces added to it, in its agent scope (the project's when it has none): `marketplaces.json`, and a copy of each in `.marketplaces/<name>/`. Installing from one goes through the same copy, hash and lock as any extension, with the plugin's name there recorded (`jokebook@shipyard`, shown by `extension list`). Trust follows [ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md):

- **The agent's own marketplace** (`official`) is known without asking, and its plugins install without a question. A folder is copied afresh every time the command runs, since it's the agent's own code; a git one is copied once and refreshed with `marketplace update`.
- **Any other** is added only by hand: the command shows its name, owner and how many extensions it offers, warns that they run with the person's permissions, and asks to type its name. Installing from it shows the plugin and asks again.

The functions behind the command are exported too, for a host with its own interface (a desktop app's extensions panel): `addMarketplace()`, `inspectMarketplace()` (read one without adding it), `listMarketplaces()`, `updateMarketplace()`, `removeMarketplace()`, `findPlugin()` and `installFromMarketplace()`. They ask nothing: asking the person is the host's.

### The catalog

What the agent's marketplaces offer is its catalog, in the command (`search`, `add`, `update`) and in the chats, so a person without a shell (a desktop app) installs and updates extensions too. The agent names its own marketplace in its config, `officialMarketplace` (a folder or a git URL), as it passes `official` to the command: the chats offer what it has, installed without a confirmation; one from any other marketplace the agent knows asks first.

- **What it lists**: each extension with the version it offers (its `plugin.json`'s, which wins over the marketplace's entry, as in Claude Code), whether it's installed, whether one installed from that marketplace has a newer version there, its **topics** and its **look** (see below).
- **Topics**: what it's about and who it's for, from Claude Code's own fields: its `plugin.json`'s `keywords`, and its marketplace entry's `tags`, `keywords` and `category`, lowercased. An audience is a topic like any other (`"miyagi"`), and the search matches topics too.
- **What an agent offers**: `catalogTopics` in its config (`["miyagi"]`) keeps its chats' catalog, and `extension search` (`runExtensionCommand()`'s `catalogTopics`), to the extensions with one of them; without it, every one. What's already installed is listed whatever its topics, and updates the same.
- **Its look**: a `logo` (square) and a `banner` (wide) in its `plugin.json`, under `metadata["agent-kit"].catalog`, paths inside its folder (SVG, PNG, JPEG or WebP; anything else, or outside its folder, isn't shown):

  ```json
  "metadata": { "agent-kit": { "catalog": { "logo": "assets/logo.svg", "banner": "assets/banner.png" } } }
  ```

  The catalog gives them as files of the marketplace's copy (`logo`, `banner`); a host serves them to its page (the chat controller's `extensionImage(spec, kind)`). Captain Whiskers' catalog is a grid of cards, each with its logo, name, version, description and topics, a search and topic chips to filter, and a card opening its details with its banner.
- **Installing** puts it in the agent's scope, enabled; the running session is untouched, so the conversation going on isn't changed under it. It's there in a new conversation, or now: `/extensions reload` (`reopen()`) opens the session again with it, keeping the conversation.
- **Updating** takes a fresh copy of its marketplace and installs it again in the same scope, its data and options kept.
- **Uninstalling** turns it off in the running session first, and deletes its data only when asked.
- In a host of your own, the chat controller's `extensionCatalog()`, `installExtension()`, `updateExtension()`, `removeExtension()`, `extensionOptions()`, `setExtensionOptions()` and `reopen()` do it (see [Custom hosts](../advanced/custom-hosts.md)); the core's `extensionCatalog()`, `installExtension()` and `updateExtension()` without a chat.

### In the chat

`/extensions` says what the session runs with, what's off and why, and what's installed. `/extensions disable <name>` and `/extensions enable <name>` change the lock and apply it (the chat must have a session opener). `/extensions config <name>` lists its [options](#its-options), and `/extensions config <name> <key>=<value>…` sets them and restarts its servers in the same session; never a secret, since what's typed in a chat is kept in its history. The [catalog](#the-catalog): `/extensions search [words]`, `/extensions install <name>` (`--yes` for one from another marketplace, after reading what it says), `/extensions update [name]`, `/extensions remove <name>` (`--delete-data` to delete its data) and `/extensions reload`. `/extensions trust` trusts the workspace's extensions; a session that opens with some untrusted asks first. It works in both chats.

**In the same session** when the extension was running when the session opened: its MCP servers are switched off (their tools leave the model's context) and its plugin is unloaded (its skills, commands and subagents go), and back again on `enable`. The kit's gates, the chat's labels, the commands, `/extensions` and [awareness](awareness.md)'s `about_me` follow, and the model is told with the person's next message, since the prompt's Extensions section still says what the session opened with. To do it, each session loads an installed extension's plugin through a link in the run's folder (`<runDir>/extensions/<name>/`, a junction on Windows), which it removes and makes again: nothing is copied, however large its `node_modules`, and what's installed is never touched. Where a link can't be made (a disk without them), it's a copy, emptied and filled.

**By opening the session again**, keeping the conversation, otherwise: an extension that wasn't running when the session opened (installed since, or enabled in the lock), or whose files changed since it was installed (a new session judges them by their hash; a [linked](#developing-one) one's aren't checked, so it turns on again with its new files). A session the agent builds itself gets the same switch from `buildSessionOptions()`'s `switchExtension(name, enabled)`, which returns `false` when it takes a new session; it needs the session running through `runQuery()`.

## What the agent sees

With any extension on, the system prompt gets an **Extensions** section after the agent's own prompt and identity, then each internal extension's own section:

```text
## Extensions
What you can do besides your own tools comes from these extensions; their sections below say how to use them.
- **sources**: The sources folder: originals kept as obtained, … Provides: sources.
- **knowledge**: Built-in knowledge base workflows (an LLM wiki) … Provides: knowledge-base.
- **jokebook**: A jokebook: classic pirate jokes, … Provides: jokes.
```

An extension that's off is listed too, with why ("it needs a folder (`dir`)", "it requires memory, which no enabled extension provides"). With the [awareness](awareness.md) extension, `about_me` tells the agent the same at any moment, so it can tell the person. An installed extension's own rules reach the model through its server's `instructions` (see below).

## Capabilities

An extension's manifest says what it **provides** and what it **requires**, as capabilities: names, not other extensions.

- An extension that requires a capability no enabled extension provides is left out, and so is any that depended on it in turn.
- A **skill** can require capabilities too, in its frontmatter; it's only offered when they're there:

```markdown
---
name: rank-jokes
description: Rank the jokes in the knowledge base by their score…
requires: knowledge-base
---
```

`requires: a`, `requires: [a, b]` and a YAML list all work. A skill left out this way isn't listed to the model and is refused by the `Skill` tool. Since the SDK's `skillOverrides` doesn't reach plugin skills, leaving one out makes the session's `skills` a list (the plugins' skills and the project's) even when the spec says `"all"`.

The kit's capabilities are `self-awareness`, `sources`, `knowledge-base` and `person-memory`; an agent names its own (miyagi's classroom capabilities, say), and two extensions may provide the same one.

## Writing an installable extension

**Any Claude Code plugin is one**, as it is: its skills, commands and subagents load as they do in Claude Code, and its MCP servers start from its own `.mcp.json`. The kit's data in its manifest, `metadata["agent-kit"]`, is optional: it adds what the kit's gates and chat can use. Captain Whiskers' `jokebook` is one:

```text
jokebook/
├── README.md                     for people: what it does, what it offers, how to install it
├── .claude-plugin/plugin.json    its manifest
├── .mcp.json                     its MCP servers, as Claude Code declares them
├── server/index.mjs              its MCP server, run with Node
├── skills/rank-jokes/SKILL.md    its skills, if any
├── commands/best-jokes.md        its commands, if any (/jokebook:best-jokes)
└── agents/loro-critico.md        its subagents, if any
```

The manifest is the plugin's: its metadata in [Claude Code's fields](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema), and the kit's data under `metadata["agent-kit"]`:

```json
{
  "name": "jokebook",
  "version": "1.1.0",
  "description": "A jokebook: classic pirate jokes, and ranking the jokes kept in a knowledge base by their score.",
  "author": { "name": "Falkenslab", "url": "https://github.com/falkenslab" },
  "homepage": "https://falkenslab.github.io/agent-kit/docs/capabilities/extensions",
  "repository": "https://github.com/falkenslab/agent-kit",
  "license": "MIT",
  "keywords": ["jokes", "pirates", "example"],
  "metadata": {
    "agent-kit": {
      "kit": ">=0.21.0",
      "provides": ["jokes"],
      "requires": [],
      "readOnlyTools": ["classic_joke"],
      "labels": {
        "classic_joke": {
          "en": { "label": "Opening the jokebook", "phrase": ["opened the jokebook", "opened the jokebook {n} times"] },
          "es": { "label": "Abriendo el libro de chistes", "phrase": ["abrió el libro de chistes", "abrió el libro de chistes {n} veces"] }
        }
      },
      "help": "The jokebook: `classic_joke` gives a classic pirate joke; the `jokebook:rank-jokes` skill ranks the knowledge base's jokes by their score."
    }
  }
}
```

- **Metadata** goes in Claude Code's own fields, in its format: `name` (kebab-case), `version`, `description`, `author` (an object, `{ name, email?, url? }`: a plain string fails validation), `homepage`, `repository`, `license`, `keywords`. `extension list` and `extension info` show them.
- **The kit's data** goes under `metadata["agent-kit"]`, the only place the kit reads. `metadata` is where Claude Code keeps a plugin's own data, which it doesn't read, so `claude plugin validate --strict` passes; a top-level key would be a warning ("Unknown field"), and a failure with `--strict`. Anything else you add is ignored by both.
- **Its options** go in Claude Code's own `userConfig`: see [Its options](#its-options).
- Check it with `claude plugin validate --strict <folder>`.

Its servers, in `.mcp.json` (or under `mcpServers` in `plugin.json`, inline or as a path), as Claude Code reads them:

```json
{
  "mcpServers": {
    "jokebook": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs"] }
  }
}
```

- Each server's name gives its tools': `mcp__jokebook__classic_joke`.
- **Node servers, or npx**: `command` is `node`, and the first of `args` its script, inside the extension (`${CLAUDE_PLUGIN_ROOT}` is its folder); the rest of `args` reach the script. Or `command` is `npx`, with `-y` and a package at an exact version, as Claude Code runs it: see [A server published to npm](#a-server-published-to-npm). Any other command (`python`, `docker`, `npx` without an exact version) leaves the extension off, saying why: the kit runs installed code only through its launcher.
- **Its folders**: `${CLAUDE_PLUGIN_ROOT}` is its plugin's folder and `${CLAUDE_PLUGIN_DATA}` its [data folder](#its-data), in `args` and `env`, as in Claude Code; the server gets both as variables too.
- **Its options**: `${user_config.KEY}` in `args` and `env` takes one of its [options](#its-options)' value, as in Claude Code.
- **Its environment**: the system's variables and those in its `env`, where `${VAR}` takes the agent's (`"JOKES_API_KEY": "${JOKES_API_KEY}"`, from its `.env`). Nothing else of the agent's: not its credentials. The system's are where things are and the desktop session: `PATH`, `TEMP`, `HOME`, `APPDATA`, `LOCALAPPDATA`, `PROGRAMFILES` and `PROGRAMFILES(X86)` (where a browser is found on Windows), `DISPLAY`, `WAYLAND_DISPLAY` and `XDG_*` (to open a window on Linux), the language and time zone, and the like.

Under `metadata["agent-kit"]`, all optional:

| Field | What it does |
| --- | --- |
| `kit` | The agent-kit versions it works with: comparators separated by spaces, all of which must hold (`>=0.21.0`, `>=0.21.0 <0.23.0`, `0.21.2`). Outside them, it's off, saying why. An upper bound turns it off with the next minor release of the kit until it's raised: leave it out unless a version is known to break it. |
| `needs` | Programs it needs on this computer, looked for on the `PATH` as a shell would (`["docker", "python3"]`; on Windows with `PATHEXT`'s extensions). Without one, it's off, saying which. |
| `provides`, `requires` | Its [capabilities](#capabilities). |
| `readOnlyTools` | Its tools that only read (short names, of any of its servers): [plan mode](../core-concepts/modes.md#plan) lets them through; every other one is denied there. Without it, plan mode asks its servers: a tool whose server marks it `readOnlyHint: true` goes through, the rest are denied. See [Read-only tools](#read-only-tools). |
| `labels` | How the chat shows each tool (short names), per language (English when the kit's isn't there): `label` (`{field}` takes the call's input, e.g. `"Rolling {sides}"`) and `phrase`, how it counts in a [folded summary](../terminal-ui/tool-labels.md#folded-summaries). |
| `help` | What it says about itself in a session, for the agent to tell the person (the [awareness](awareness.md) extension's `about_me`). |

### Read-only tools

[Plan mode](../core-concepts/modes.md#plan) lets through only the tools known to only read. An installed extension says which in one of two ways:

- **Its servers' hints**, when its manifest has no `readOnlyTools`: a tool whose server declares `annotations: { readOnlyHint: true }` goes through, asked of the running session when plan mode meets the call, so a server that gains a tool needs no change in the manifest. A server still connecting, one turned off, or one that doesn't answer in 3 seconds counts as no.
- **Its manifest's list**, `readOnlyTools`: the whole answer, whatever its servers say. An empty list (`[]`) means none of its tools goes through. A server is the code the kit trusts least, so its hints only fill the list's absence; write the list when you don't trust, or can't change, what a server says.

`extension info <name>` says which applies (`Only read  roll (its manifest)`, or `what its servers mark readOnlyHint`).

### Its options

An extension that needs values from the person (a site's URL, a token) declares them as Claude Code does, under `userConfig` in its `plugin.json`, and its servers take them as `${user_config.KEY}` in their `args` and `env`. The same folder works in Claude Code, which asks for them itself.

```json
{
  "name": "moodle",
  "userConfig": {
    "moodle_url": { "type": "string", "title": "Moodle URL", "description": "Your Moodle site, e.g. https://campus.example.org", "required": true },
    "token": { "type": "string", "title": "Token", "description": "A web service token, if your site gives you one.", "sensitive": true },
    "headless": { "type": "boolean", "title": "Without a window", "description": "Run the browser without a window.", "default": false }
  }
}
```

```json title=".mcp.json"
{ "mcpServers": { "moodle": { "command": "npx", "args": ["-y", "@falkenslab/moodle-mcp@0.2.0"], "env": { "MOODLE_URL": "${user_config.moodle_url}", "MOODLE_MCP_HEADLESS": "${user_config.headless}" } } } }
```

- **An option** has a `type` (`string`, `number`, `boolean`, `directory` or `file`), a `title` and a `description`, and may have `required`, `default`, `sensitive`, `options` (the values it may take), `multiple` (several, comma-separated) and `min`/`max` for a number. An option with another field leaves the extension off, as Claude Code refuses it; so does a server naming `${user_config.KEY}` that isn't declared.
- **Asked when it's installed**: `extension add` asks for each one without a value, on a terminal (a secret without echo); `--set <key>=<value>` gives one without asking. `extension config` shows and changes them later, `/extensions config` in the chat too (never a secret there).
- **A required one without a value** (nor a default) keeps the extension off, saying which and how to set it.
- **Where the values are**: never in the prompt, the transcript or a tool's result. Non-sensitive ones in its lock entry (`options`, so a workspace shares them), sensitive ones in its scope's private folder (`.secrets/<name>.json`: the agent's scope's own, or for a workspace's extension in the agent's folder, never the project), which no session's file tools reach, even with the scope's folder readable. Reinstalling keeps them; removing deletes the secrets.
- **Changed while a session runs**: the launcher reads the values when it starts a server, so a change reaches it when it starts again. `/extensions config` in the chat restarts its servers in the same session (`reconnectMcpServer()`: a new process with the values as they are now), and the model is told with the next message; a call running at that moment fails. A change made with `extension config` from another terminal applies when its server starts again: a new session, or `/extensions disable` and `enable`. A session the agent builds itself gets `restartExtension(name)` from `buildSessionOptions()`, which returns `false` when it can't be done in that session.
- **Values as text**: a boolean as `true` or `false`, a list comma-separated, one without a value as empty.
- `${user_config.KEY}` in a skill's or subagent's content, which Claude Code also expands, isn't expanded by the kit.

### Its data

An installed extension has a data folder of its own, `<scope>/.data/<name>/` (e.g. `~/.miyagi/extensions/.data/moodle/`; a workspace's, in its private folder in the agent's: see [A workspace's extensions](#a-workspaces-extensions)), named in its servers' `args` and `env` as `${CLAUDE_PLUGIN_DATA}`, like Claude Code's for a plugin. Keep there what must last: a browser profile with a signed-in session, a cache, a downloaded browser.

```json
{ "mcpServers": { "moodle": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs", "--profile", "${CLAUDE_PLUGIN_DATA}/profile"] } } }
```

- It's created when a session starts the extension, outside its plugin and its hash: what the server writes there never turns the extension off.
- It's kept when the extension is installed again or updated, and when it's removed unless the person says to delete it.
- Never write in the plugin's own folder: an update replaces it, and a changed file leaves the extension off until it's installed again.

### Developing one

`extension add <folder> --link` registers the folder where it is: the agent runs it from there, its files aren't checked against a hash, and the lock says it's linked. Rebuild it (`esbuild`, `tsc`) and it takes effect when its server starts again: a new session, or `/extensions disable <name>` and `/extensions enable <name>` in the chat, which turns a linked extension back on with its new files. `extension remove` only forgets it; the folder stays. Install it normally (a copy, hashed) once it's published.

### When it's turned off

Turning an extension off in the session, or closing the session, ends its servers and every process they started: a browser Playwright opened, with all its own processes, ends too, and its profile isn't left locked for the next start (confirmed empirically on Windows: the SDK's CLI ends a server's whole process tree). A server needn't clean up on its own, but it may: closing the browser when its input ends saves the browser's state properly.

**A `README.md`** at its root is for people: what it does, what it offers (its tools, skills, subagents, capabilities), what it requires, how to install it. The model never reads it; `extension info` says where it is. The jokebook's is an example.

**What it's for and its rules** go in the `instructions` its server sends when it connects: the model has them from the start, like an internal extension's prompt section. Keep them short; procedures go in skills.

**The server** runs from what's installed: write it without dependencies, or bundle it into one file with them (esbuild). A package from a marketplace's `npm` source brings no `node_modules`, and a folder installed with its development `node_modules` is hashed whole every session (seconds for tens of thousands of files): install the package, not the development folder, and use `--link` while developing. The jokebook's is a small script that speaks MCP over stdio by hand; a bigger one would use `@modelcontextprotocol/sdk`, bundled.

### A server published to npm

An MCP server published to npm on its own (usable with `npx` in Claude Code or Codex) needn't be copied into the extension: its `.mcp.json` runs it with `npx`, and the extension is its manifest, that file, and its skills and commands.

```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp@0.2.0"],
      "env": { "MOODLE_URL": "${MOODLE_URL}", "MOODLE_MCP_PROFILE_DIR": "${CLAUDE_PLUGIN_DATA}/profile" }
    }
  }
}
```

Claude Code runs that `npx` as it is. The kit doesn't run npx: it would need npm, a `node` on the `PATH` (npm's shims call it) and the network while the server connects, none of which the desktop app has. Instead:

- **When the extension is installed**, the kit fetches the package from the npm registry, checks it against the registry's `integrity` (sha512) and keeps it in the agent's package cache, `<agent scope>/.npm/<package>/<version>/`, shared by both scopes: two extensions, or two scopes, running the same version share one copy. The lock records it (`packages`: its integrity, a SHA-256 over its files, its `bin`); `extension info` lists it.
- **When a session starts**, the server is the package's `bin` run with the agent's own Node (Electron's, in a desktop app) through the launcher, like any installed server: its `env`, its folders, the arguments after the package. No npm, no network: a package missing from the cache, or whose files changed there, leaves the extension off, saying to install it again.
- **Only an exact version**: `<package>@x.y.z`. A published npm version never changes, so the extension runs the same code every time; without a version, a range or a tag (`@latest`), it can't be installed. The only option is `-y` (`--yes`).
- **The package brings what it needs**: the kit installs no dependencies and runs no script. A package whose `dependencies` aren't all in `bundleDependencies`, with install scripts (`preinstall`, `install`, `postinstall`) or native code to build (`binding.gyp`) can't be installed, saying why. Bundle the server (esbuild), and list in `bundleDependencies` what can't be bundled (`playwright-core`).
- **Its `bin`**: the package's only one, or the one named like the package (`moodle-mcp` for `@falkenslab/moodle-mcp`), as npx picks it.
- **Updating the server** is a new version in `.mcp.json` and installing the extension again; skills written for that version go in the same change.

The registry is `https://registry.npmjs.org`.

**What it can't do**, unlike an internal one: hooks (none of its plugin's run: `settings.disableAllHooks` while one is on), the kit's panels, a store passed from code, its own folders for the file tools. Its subagents get no `Bash`: one that lists it loses it, and one without `tools` gets none. Its tools go through the same gates as any other: the approval in interactive mode, plan mode, the transcript.

## Writing one in your agent's code

An extension only one agent needs, or one that needs the kit's internals, can be code in the agent: a plugin folder in its project plus an object that implements `Extension`.

```ts
import path from "node:path";
import { createSdkMcpServer, tool, type Extension } from "@falkenslab/agent-kit";
import { z } from "zod";

export const diceExtension: Extension = {
  name: "dice", // the same as its plugin's
  plugin: path.join(__dirname, "extensions", "dice"), // .claude-plugin/plugin.json, skills…
  // missing: ({ config }) => (config.diceDir ? undefined : "needs `diceDir` in the config"),
  async contribute({ config, spec, runDir, mode, interactive }) {
    const roll = tool("roll", "Rolls a die.", { sides: z.number() }, async ({ sides }) => ({
      content: [{ type: "text" as const, text: String(1 + Math.floor(Math.random() * sides)) }],
    }), { annotations: { readOnlyHint: true } });
    return {
      mcpServers: { dice: createSdkMcpServer({ name: "dice", version: "1.0.0", tools: [roll] }) },
      promptSection: "## Dice\nWhen the person wants a roll, `roll` it: never make one up.",
      readOnlyTools: ["mcp__dice__roll"], // plan mode lets it through
      toolLabels: { mcp__dice__roll: { label: (input) => `Rolling a ${String(input.sides)}-sided die`, phrase: ["rolled once", "rolled {n} times"] } },
      helpLines: ["Dice: `roll` rolls one."],
    };
  },
};
```

What a contribution may carry (every part optional):

| Field | What it does |
| --- | --- |
| `mcpServers` | Its MCP servers, by name: its tools are `mcp__<name>__<tool>`. |
| `promptSection` | A section of the system prompt, after the Extensions list. Keep it short: what it's for and its rules. Procedures go in skills. |
| `fileTools` | Built-in file tools the session must have (`Read`, `Glob`, `Grep`…). |
| `readOnlyDirs` | Folders the file tools may read and search, never write. |
| `toolOnlyDirs` | Folders reached only through its own tools, never the file tools, with what to use instead (the denial says it). |
| `readOnlyTools` | Its tools that only read: [plan mode](../core-concepts/modes.md#plan) lets them through; every other MCP tool is denied there. |
| `readOnlyHintServers` | Its MCP servers whose tools plan mode lets through when the server marks them `readOnlyHint: true`, asked while the session runs. An installed extension without `readOnlyTools` in its manifest sets it; one in your code usually lists `readOnlyTools` instead. |
| `selfAskingTools` | Its tools that ask the person themselves (a panel): interactive mode doesn't ask before them. |
| `toolLabels` | How the chat shows its tools, by full name: each one's line and how it counts in a folded summary, in the kit's language. See [An extension's labels](../terminal-ui/tool-labels.md#an-extensions-labels). |
| `hooks` | Its SDK hooks, by event, run after the kit's own (the memory hears the person's messages with `UserPromptSubmit`). |
| `helpLines` | What it says about itself in this session (its commands, its folder), which the [awareness](awareness.md) extension's `about_me` gives the agent. |
| `api` | What the extension hands the host: `buildSessionOptions()` returns every active extension's under `apis`, by name, and the chat controller's `api(name)` gives it (the `sources` extension's `addSource` at `apis.sources.addSource`, the knowledge base's store at `apis.knowledge.knowledgeStore`). |

`missing(context)` says why the extension can't run in this session (a folder it needs), or `undefined`. The context has the config, the spec, the run folder, the mode, whether a person can be asked, and `capabilities`: what the session's active extensions provide (their manifests' `provides`), for an extension that works differently beside another. It's known once the extensions are resolved, so it's empty in `missing()` and filled in `contribute()`: the knowledge base explains matching its summaries to the originals when `capabilities.has("sources")`.

Its plugin is loaded like any of the agent's, so its skills, commands and subagents are named after it (`dice:…`); with `skills: "plugins"` its skills are offered without naming them, and its subagents (`agents/*.md`) are registered like the agent's own (see [Subagents in a plugin](subagents.md#subagents-in-a-plugin)).

## Where they run

Internal extensions run in the agent's process: the kit's are reviewed with it, and an agent's own are its author's code. Installed ones run apart, because their code may come from anyone: their server is a separate Node process, started through the kit's launcher, which removes every environment variable but the system's and those the manifest declares (the SDK merges a server's `env` with the agent's own, so passing `env` alone wouldn't hide the agent's credentials). Marketplaces, with an official repository per agent and a confirmation for any other, come later ([ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md)).
