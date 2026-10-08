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
const spec: AgentSpec<Config> = {
  // …
  extensions: ["sources", "knowledge", "memory", diceExtension],
};

const config: Config = {
  // …
  sourcesDir: path.join(workspace, "sources"), // "sources" needs it
  knowledgeDir: path.join(workspace, "knowledge"), // "knowledge" needs it
  memoryDir: path.join(os.homedir(), ".my-agent", "memory"), // "memory" needs it
};
```

- The kit's are enabled **by name**; an agent's own **as an object** (see [Writing one in your agent's code](#writing-one-in-your-agents-code)).
- **None is on by default.** A folder in the config doesn't turn anything on by itself: `knowledgeDir` without `"knowledge"` is a folder of the agent's own notes, kept with the file tools under rules it writes itself.
- An extension the session lacks something for (its folder) is **left out**, and so is one whose required capabilities nothing enabled provides (see [Capabilities](#capabilities)). The system prompt says which ones are off and why, so the agent can tell the person.
- An unknown name is an error.

| Extension | Needs | What it brings |
| --- | --- | --- |
| `awareness` | `identity` in the spec | [Awareness](awareness.md): the "Who you are" prompt section, `about_me` (what the agent is right now, read from the session on every call, and its `helpGuide`) and the `help` skill (how the kit's chat is used). Provides `self-awareness`. |
| `sources` | `sourcesDir` | The originals: the sources tools (`list_sources`, `extract_text`, `save_to_sources`, `download_to_sources`, and `request_file`, `retire_source` outside autonomous mode), `Read`/`Glob`/`Grep` on the folder, never writing it, and its prompt section. See [Sources](knowledge-base.md#sources-originals-kept-as-obtained). Provides `sources`. |
| `knowledge` | `knowledgeDir` | The [knowledge base](knowledge-base.md): the `knowledge_*` tools over a store, its prompt section with the person's preferences, its skills and commands; the file tools never reach the folder. Provides `knowledge-base`. |
| `memory` | `memoryDir` | The [memory of the person](memory.md), across all their projects: its tools (`recall`, `remember`, `forget`), its prompt section with what it remembers, `/memory:list` and `/memory:forget`; saved only from what the person wrote. Provides `person-memory`. |

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

Each scope is a folder with one subfolder per extension and a lock, `extensions.lock.json`: where each came from (a folder, or a git URL and the commit it was cloned at), a SHA-256 over its files, and whether it's enabled. Every enabled one in them runs with the session, alongside the internal ones and resolved the same way (capabilities, the Extensions section of the prompt), unless:

- its files changed since it was installed (the hash doesn't match): install it again to trust the change;
- its manifest says it works with other agent-kit versions (`kit`);
- a program it needs isn't on this computer's `PATH` (`needs`);
- its server isn't where its manifest says;
- an extension the spec enables has its name.

Then it's off, and the prompt and `/extensions` say why.

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
| `extension info <name>` | Everything its manifest says (description, author, license, homepage, repository, keywords, the agent-kit versions, capabilities, tools, variables), how it was installed, and where its README is. |
| `extension add <folder>` | Copies the folder into the agent's scope, checks its manifest, hashes it and locks it, enabled. |
| `extension add <git URL>[#ref] [--path <subfolder>]` | Clones the repository at the ref (`https://…`, `git@…`, `file://…`, `github:owner/repo`) and records the commit. |
| `extension add <plugin>[@<marketplace>]` | Installs a plugin of a known [marketplace](#marketplaces), from wherever the marketplace says (the marketplace's own folder, or a git repository at a ref or commit); `@<marketplace>` only when two offer that name. One from a marketplace that isn't the agent's own asks first. |
| `extension add … --project` | Into the project's scope instead. |
| `extension remove <name>` | Removes its files and its lock entry. |
| `extension enable <name>` | Turns it on. |
| `extension disable <name>` | Turns it off, keeping it installed. |
| `extension search [words]` | What the known marketplaces offer, matching the words in a plugin's name, description, category, tags or keywords; installed ones are marked. |
| `extension marketplace add <folder \| git URL[#ref] \| owner/repo>` | Adds a marketplace after a warning and typing its name. |
| `extension marketplace list` | The known marketplaces: the official one marked, how many extensions each offers, where from and when it was copied. |
| `extension marketplace update [name]` | Takes a fresh copy of one, or all; installed extensions stay as they are until added again. |
| `extension marketplace remove <name>` | Forgets it; the extensions installed from it stay. |

Without a scope, `remove`, `enable` and `disable` act where the extension is (in both: say which, `--project` or `--agent`). Installing never runs a script: a repository's install scripts, if any, don't run. `--yes` answers the command's questions (a script); without a terminal, they're answered no.

### Marketplaces

A repository of extensions is a [Claude Code marketplace](https://code.claude.com/docs/en/plugins/marketplace-reference) as it is: a folder or git repository with `.claude-plugin/marketplace.json` listing its plugins and where each comes from. The same file serves Claude Code and agents on the kit, and `claude plugin validate <folder>` checks it (the kit's `"agent-kit"` key in a plugin shows as a warning: Claude Code ignores it).

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

### In the chat

`/extensions` says what the session runs with, what's off and why, and what's installed. `/extensions disable <name>` and `/extensions enable <name>` change the lock and apply it (the chat must have a session opener). It works in both chats.

**In the same session** when the extension was running when the session opened: its MCP servers are switched off (their tools leave the model's context) and its plugin is unloaded (its skills, commands and subagents go), and back again on `enable`. The kit's gates, the chat's labels, the commands, `/extensions` and [awareness](awareness.md)'s `about_me` follow, and the model is told with the person's next message, since the prompt's Extensions section still says what the session opened with. To do it, each session loads an installed extension's plugin from a copy in the run's folder (`<runDir>/extensions/<name>/`), which it empties and fills again; what's installed is never touched.

**By opening the session again**, keeping the conversation, otherwise: an extension that wasn't running when the session opened (installed since, or enabled in the lock), or whose files changed since it was installed (a new session judges them by their hash). A session the agent builds itself gets the same switch from `buildSessionOptions()`'s `switchExtension(name, enabled)`, which returns `false` when it takes a new session; it needs the session running through `runQuery()`.

## What the agent sees

With any extension on, the system prompt gets an **Extensions** section after the agent's own prompt and identity, then each internal extension's own section:

```text
## Extensions
What you can do besides your own tools comes from these extensions; their sections below say how to use them.
- **sources**: The sources folder: originals kept as obtained, … Provides: sources.
- **knowledge**: Built-in knowledge base workflows (an LLM wiki) … Provides: knowledge-base.
- **jokebook**: A jokebook: classic pirate jokes, … Provides: jokes.
```

An extension that's off is listed too, with why ("it needs `knowledgeDir` in the config", "it requires memory, which no enabled extension provides"). With the [awareness](awareness.md) extension, `about_me` tells the agent the same at any moment, so it can tell the person. An installed extension's own rules reach the model through its server's `instructions` (see below).

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

**Any Claude Code plugin is one**, as it is: its skills, commands and subagents load as they do in Claude Code, and its MCP servers start from its own `.mcp.json`. The kit's key in its manifest, `"agent-kit"`, is optional: it adds what the kit's gates and chat can use. Captain Whiskers' `jokebook` is one:

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

The manifest is the plugin's: its metadata in [Claude Code's fields](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema), and the kit's data under `"agent-kit"`:

```json
{
  "name": "jokebook",
  "version": "1.0.0",
  "description": "A jokebook: classic pirate jokes, and ranking the jokes kept in a knowledge base by their score.",
  "author": { "name": "Falkenslab", "url": "https://github.com/falkenslab" },
  "homepage": "https://falkenslab.github.io/agent-kit/docs/capabilities/extensions",
  "repository": "https://github.com/falkenslab/agent-kit",
  "license": "MIT",
  "keywords": ["jokes", "pirates", "example"],
  "agent-kit": {
    "kit": ">=0.18.0 <0.20.0",
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
```

- **Metadata** goes in Claude Code's own fields, in its format: `name` (kebab-case), `version`, `description`, `author` (an object, `{ name, email?, url? }`: a plain string fails validation), `homepage`, `repository`, `license`, `keywords`. `extension list` and `extension info` show them.
- **The kit's data** goes under `"agent-kit"`, the only key the kit reads. Claude Code ignores it: `claude plugin validate` passes with a warning ("Unknown field 'agent-kit'"). Anything else you add is ignored by both: keep your own data out of the manifest.
- Check it with `claude plugin validate <folder>`.

Its servers, in `.mcp.json` (or under `mcpServers` in `plugin.json`, inline or as a path), as Claude Code reads them:

```json
{
  "mcpServers": {
    "jokebook": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs"] }
  }
}
```

- Each server's name gives its tools': `mcp__jokebook__classic_joke`.
- **Only Node servers**: `command` is `node`, and the first of `args` its script, inside the extension (`${CLAUDE_PLUGIN_ROOT}` is its folder); the rest of `args` reach the script. Any other command (`python`, `npx`, `docker`) leaves the extension off, saying why: the kit runs installed code only through its launcher.
- **Its environment**: the system's variables (`PATH`, `TEMP`, `HOME`…) and those in its `env`, where `${VAR}` takes the agent's (`"JOKES_API_KEY": "${JOKES_API_KEY}"`, from its `.env`). Nothing else of the agent's: not its credentials.

Under `"agent-kit"`, all optional:

| Field | What it does |
| --- | --- |
| `kit` | The agent-kit versions it works with: comparators separated by spaces, all of which must hold (`>=0.19.0 <0.21.0`, `0.19.2`). Outside them, it's off. |
| `needs` | Programs it needs on this computer, looked for on the `PATH` as a shell would (`["docker", "python3"]`; on Windows with `PATHEXT`'s extensions). Without one, it's off, saying which. |
| `provides`, `requires` | Its [capabilities](#capabilities). |
| `readOnlyTools` | Its tools that only read (short names, of any of its servers): [plan mode](../core-concepts/modes.md#plan) lets them through; every other one is denied there. Without it, plan mode denies them all. |
| `labels` | How the chat shows each tool (short names), per language (English when the kit's isn't there): `label` (`{field}` takes the call's input, e.g. `"Rolling {sides}"`) and `phrase`, how it counts in a [folded summary](../terminal-ui/tool-labels.md#folded-summaries). |
| `help` | What it says about itself in a session, for the agent to tell the person (the [awareness](awareness.md) extension's `about_me`). |

**A `README.md`** at its root is for people: what it does, what it offers (its tools, skills, subagents, capabilities), what it requires, how to install it. The model never reads it; `extension info` says where it is. The jokebook's is an example.

**What it's for and its rules** go in the `instructions` its server sends when it connects: the model has them from the start, like an internal extension's prompt section. Keep them short; procedures go in skills.

**The server** runs installed as copied, with no `node_modules`: write it without dependencies, or bundle it into one file with them (esbuild). The jokebook's is a small script that speaks MCP over stdio by hand; a bigger one would use `@modelcontextprotocol/sdk`, bundled.

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
| `selfAskingTools` | Its tools that ask the person themselves (a panel): interactive mode doesn't ask before them. |
| `toolLabels` | How the chat shows its tools, by full name: each one's line and how it counts in a folded summary, in the kit's language. See [An extension's labels](../terminal-ui/tool-labels.md#an-extensions-labels). |
| `hooks` | Its SDK hooks, by event, run after the kit's own (the memory hears the person's messages with `UserPromptSubmit`). |
| `helpLines` | What it says about itself in this session (its commands, its folder), which the [awareness](awareness.md) extension's `about_me` gives the agent. |
| `api` | What the extension hands the host: `buildSessionOptions()` returns every active extension's under `apis`, by name, and the chat controller's `api(name)` gives it (the `sources` extension's `addSource`, the knowledge extension's store, also as `knowledgeStore`). |

`missing(context)` says why the extension can't run in this session (a folder it needs), or `undefined`. The context has the config, the spec, the run folder, the mode and whether a person can be asked.

Its plugin is loaded like any of the agent's, so its skills, commands and subagents are named after it (`dice:…`); with `skills: "plugins"` its skills are offered without naming them, and its subagents (`agents/*.md`) are registered like the agent's own (see [Subagents in a plugin](subagents.md#subagents-in-a-plugin)).

## Where they run

Internal extensions run in the agent's process: the kit's are reviewed with it, and an agent's own are its author's code. Installed ones run apart, because their code may come from anyone: their server is a separate Node process, started through the kit's launcher, which removes every environment variable but the system's and those the manifest declares (the SDK merges a server's `env` with the agent's own, so passing `env` alone wouldn't hide the agent's credentials). Marketplaces, with an official repository per agent and a confirmation for any other, come later ([ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md)).
