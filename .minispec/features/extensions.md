# Extensions on Claude Code plugins and marketplaces

Issue: [#29](https://github.com/falkenslab/agent-kit/issues/29)

## Goal

Every agent on the kit is "the kit + a set of built-in extensions + configuration", and its users can install more from repositories, with the kit providing the mechanism (formats, installer, store, lock, trust, isolation) and each agent the policy (which extensions, its capabilities, its official repository).

## Context

- Designed in miyagi (its ADR-020; falkenslab/miyagi#33, #36, #41), but almost nothing in it is domain-specific: built there, padawan would copy it. Same split as the file scope (#28, done: Read and Glob only reach the agent's folders): mechanism in the kit, policy in the agent.
- Concepts decided: an **extension** is the package (installed, versioned, enabled per project); a **capability** is what it lets the agent do (`provides`), named and specified by the agent, never by the kit. Two extensions may provide the same capability. A skill may `requires:` a capability and is offered only when one is enabled.
- Two levels: **built-in** (shipped with the agent; tools and hooks in-process, may hook into internals) and **from a repository** or the project's own (a plugin with files; tools as MCP servers in a separate process; never in-process code nor its own hooks).
- Today the kit already loads local plugins (`AgentSpec.pluginRoots`, the knowledge and agent-help plugins) with `skipMcpDiscovery: true`; it has no installer, store, lock, capabilities nor trust prompts.
- "SDK first": an extension is a **Claude Code plugin** (`.claude-plugin/plugin.json`, skills, commands, agents, `.mcp.json`, hooks), a repository is a **Claude Code marketplace** (`marketplace.json`). The SDK only loads local plugins; adding marketplaces, installing, versions, pinning and trust are CLI-only, and that's what the kit builds. The agent's own data goes in `plugin.json` under the agent's key (`claude plugin validate` warns and passes).
- Probe in miyagi (Claude Code 2.1.283 / SDK 0.3.283):
  - plugin tools are `mcp__plugin_<plugin>_<server>__<tool>`; with `skipMcpDiscovery` and the host's `mcpServers`, `mcp__<server>__<tool>`;
  - host hooks deny plugin tools before they reach the plugin's server;
  - `settings.disableAllHooks: true` stops the plugin's hooks, not the host's callbacks;
  - **`env` doesn't isolate** a plugin server's environment (merged with the process's): a clean one needs a launcher.

## Changes

In phases; each one gets its own note when it starts, and this one keeps the whole.

1. **ADR** in the kit: extensions on plugins and marketplaces; the two levels; capabilities and skill requirements; extensions as per-project dependencies (a shareable project file with ranges and `"builtin"`, secrets apart; a lock with repository, version, commit, SHA-256); an immutable store in the user's home, out of the agent's reach; repositories (one official per agent, others added by hand with a typed confirmation, names `<repo>/<name>`); what the kit guarantees whatever the source (approvals, MCP tools treated as publishing unless confirmed read-only, secrets only to the extension that declares them, a clean environment, results framed as data); the "SDK first" rule. Tried on Captain Whiskers.
2. **Installer**: read `marketplace.json`, download a plugin at a pinned commit, verify its hash, confirm, store, lock, pass it to the SDK as a local plugin; `skipMcpDiscovery` plus a launcher that clears the environment and passes only declared secrets; `disableAllHooks` for non-built-ins; missing dependencies reported and offered, never installed silently; machine requirements (`requires: docker`) checked; SemVer and the API version the manifest supports. Reuse `claude plugin validate` and the `{name}--v{version}` tags in the official repository's CI.
3. **The knowledge base and the sources tools as built-in extensions**: `sources` standalone (an agent that only gathers documents), `knowledge` optionally depending on it (ingesting, and tracking which originals are ingested, are the knowledge base's). Decided (#30, which goes first): **each extension owns its data, and the model connects them when it sees fit**, through their tools; neither reads nor writes the other's data, so the model only carries short identifiers and dates, and comparisons that must be exact are a tool's (`date_math`). The same rule holds for any two extensions. Same manifest: page types from extensions; an agent without them doesn't enable them (`knowledgeBase` goes). Then manual intervention; then the capabilities that are always on today (see the inventory).
4. **miyagi adopts it** (its own repo's work): its features shrink to its built-ins, classroom contracts, official repository and project file. padawan and Captain Whiskers too.

No backward compatibility is kept (padawan and miyagi are unstable and unused, 6 October 2026): each phase changes the defaults directly, and the release notes say what changed.

## Proposals for the ADR

- **Built-in doesn't mean mandatory.** Built-in says where an extension comes from and how far it's trusted (shipped in the package, reviewed, in-process, may hook into internals); enabling it is each agent's choice. An agent without memory doesn't enable the knowledge base and pays nothing for it. The difference with today is the default: the knowledge base turns itself on with `knowledgeDir`; as an extension, the agent asks for it (e.g. `extensions: ["knowledge"]`).
- **Inventory** of what the kit has today (cost: input tokens per call, measured on Captain Whiskers):
  - optional, built-in extensions: the knowledge base (`knowledgeDir`, ~3.4k), the sources tools (`sourcesDir`, ~2.2k plus `Read`/`Glob`/`Grep`; they bring the optional dependencies `mammoth`, `fflate`, `readability`, `linkedom`, `turndown`), manual intervention (`manualInterventionTexts`, small; domain-specific, for agents that drive a window);
  - always on today, to become capabilities an agent enables, through the same mechanism rather than loose `AgentSpec` switches: the task list (`TodoWrite`, ~3.4k, see #27), the clock (`current_time`, `date_math`; `disallowedTools` doesn't remove MCP tools), the web (`WebFetch`/`WebSearch`, ~1.4k; an agent that mustn't go online has no way to turn it off but `disallowedTools`);
  - small and tied to the chat, stays in the core: agent-help (`identity`, ~0.2k);
  - never extensions, the core: the modes and their gates (approvals, `ask_human`, `present_plan`, the step, plan and file scope gates), subagents and their three gates, the transcript, languages, run folders and resuming, the chats.
- **Official extensions run with Node, bundled at publish time.** The official repository's CI bundles each extension's MCP server into one file with its dependencies inlined (esbuild: `--bundle --platform=node --format=esm`, only `node:` modules external); what's published is `dist/server.mjs`, no `node_modules`. The lock's SHA-256 covers the whole code; no install scripts ever run; installing is copying a folder, offline, with no npm needed. The launcher starts it with `process.execPath` (the agent's own Node, not whatever `node` is on the `PATH`), with a clean environment; the manifest declares `engines.node`, checked before loading.
  - No native dependencies in official extensions (`sharp`, `better-sqlite3`…): WASM versions (`sql.js`, `@sqlite.org/sqlite-wasm`) or a container.
  - Fallback for a third-party extension that isn't bundled: `npm ci --ignore-scripts --omit=dev` in the store from its `package-lock.json`, after the same confirmation; an exception, not the rule.
  - Built-in extensions run in the agent's process: their dependencies are the kit's package's (optional peers, as today).
  - To verify: whether Claude Code marketplaces accept an `npm` source for a plugin.
- **An extension builder, in the official repository first.** A script (`scripts/build-extension.mjs`, ~50–100 lines) and a GitHub Actions workflow on each tag, plus an extension template: bundle with esbuild (failing on a native `.node` dependency); validate with `claude plugin validate` plus the kit's checks (the agent's key in `plugin.json`: `provides`, `requires`, API version; `.mcp.json` pointing at `dist/server.mjs`); compute the SHA-256, update `marketplace.json`, tag with `claude plugin tag` (`{name}--v{version}`). It moves into the kit as a command (`npx agent-kit extension build`, `… validate`) when a second repository needs it, so builder and installer can't drift. While an extension is being developed it's loaded unbundled from the project's `extensions/` folder (`tsx`, its own `node_modules`): bundling is only for publishing.

## Adding and removing extensions mid-session (probed)

Probed with real calls (SDK 0.3.283, streaming input), a stdio and an in-process MCP server each with `instructions`, and local plugins changed on disk:

- **How the model learns an extension**, in layers: its tools' descriptions (what and when, always in context); its MCP server's `instructions` (what it's for and its rules, always in context, short); its skills (procedures, loaded on demand; `requires:` a capability); and a short "active extensions" section the kit composes from the manifests (also what `agent-help` tells the person). The agent's own prompt speaks of capabilities, not extensions.
- **MCP `instructions` reach the model**, from in-process and stdio servers alike, both at start and when added mid-session.
- **`setMcpServers()` adds and removes servers mid-session**: their tools, and their instructions, appear or disappear on the next turn. Gotcha: it replaces the set of "dynamic" servers, and in-process servers passed in `options.mcpServers` count as dynamic (one was dropped), while stdio ones from the options are kept: every call must name all the in-process servers to keep (the kit's own: knowledge, time, approvals…).
- **`reloadPlugins()` picks up changes on disk**: a new skill in a plugin, and a whole plugin (with skills and subagents) at a path that was in `options.plugins` but didn't exist at start; removing that folder and reloading removes them. A plugin at a path not declared at start can't be added (`plugins` is fixed): the kit declares one path per installed extension (e.g. under the run folder) and fills or empties it to enable or disable it. An extension installed mid-session needs the session reopened (as `/resume` does, keeping the conversation).
- **A `skills` list is fixed at start**: skills added later are listed but refused ("not in this session's skills allowlist"). With `skills: "all"` they work. So the kit's `skills: "plugins"` (a list computed at start) doesn't survive hot changes: for extensions use `"all"` with the settings `disableBundledSkills: true` (drops the ~20 skills that ship with the CLI; only `design` and `doctor` remain) and, to hide one skill mid-session, `skillOverrides` through `applyFlagSettings()`.
- **The kit's policy must be live**: the file scope's folders, plan mode's read-only tools, tool labels, the `Bash` decision and the subagent allow-list are computed once in `buildSessionOptions()` today; hot extensions need a registry the hooks read on every call (as they already read the current mode through `ModeControl`), and a note to the model on the next message ("extension X enabled: …" or "… disabled"), as plan mode's notices do (`takeNotice`).
- Found on the way: **claude.ai connectors** (the account's own MCP connectors, e.g. "Claude Docs") were loaded into a session with `settingSources: []` when it ran with the developer's Claude login; `settings.disableClaudeAiConnectors: true` keeps them out. The kit doesn't set it today.

## Decided (6 October 2026)

- **Knowledge, sources and memory stay internal** (in-process, as today: the injectable `KnowledgeStore`, the person's panels, the hooks), **managed as extensions**: the same manifest and the same way to enable them as external ones (e.g. `extensions: ["knowledge"]`); only where they run differs. The options they replace (`knowledgeBase`, and `knowledgeDir`/`sourcesDir` turning them on by themselves) go. External extensions (Docker, Moodle, the users') run out of process.
- **Enabling or disabling an extension reopens the session**, keeping the conversation (as `/resume` does); the kit's rules are computed once. Hot reloading (probed above) comes later.
- **Releases stay 0.x** (a minor bump for each change that breaks something, as so far); 1.0 is declared when extensions are stable.
- **An extension names no agents**: it depends on the kit's API (a range of agent-kit versions in its manifest) and on capabilities (`provides`); any agent on those kit versions that asks for its capability uses it. A capability defined by one agent (miyagi's `classroom_*`) is a contract, not a name: another agent asking for it gets the same extension.
- **Dependencies only on capabilities**: an extension `requires: ["run-containers"]`, never another extension by name; with no enabled extension providing it, it stays inactive and the agent says why. No dependency tree to resolve.
- **One project file for every agent**, the kit's (e.g. `agent.json` with `extensions`, and `agent.lock`), with a free section for each agent's own keys; secrets always apart (`.env`).
- **A plugin's subagents are registered like the code's**: in the allow-list as `<plugin>:<name>`, in the `Agent`/`Bash` decision, with the reply-language line; for an extension from a repository, no `Bash` unless the person accepted it. Probed (see below).
- **The file scope and plan mode vs the SDK's permission rules: probe first**, before the ADR: `Read(//path/**)` allow and deny rules (does a deny on `Read` stop `Glob`/`Grep`?), `dontAsk`, `permissionMode: "plan"`; migrate what they cover as well (messages that teach the model included), keep the hooks for the rest.

## Probes and notes

- Subagents declared by a plugin (`agents/*.md`): today the kit only knows those from `AgentSpec.buildSubagents()`, and only those get the `Agent` tool, the type gate's allow-list, the `Bash` decision (#25) and the reply-language line; Captain Whiskers declares his in code for that reason (and because his prompts use his name in the kit's language). Probed (SDK 0.3.283, a local plugin `probe` with `agents/echo-bot.md`):
  - the SDK loads it as `probe:echo-bot` (in the init message's `agents`, next to its own built-ins: `general-purpose`, `Explore`, `Plan`…), and with `Agent` in the tools the model delegates to it and it answers;
  - through the kit, the type gate denies it ("Delegation is only available for …") unless `allowedSubagentTypes` names it as `probe:echo-bot`; then it works;
  - the session only gets `Agent` if `buildSubagents()` returns something, so a plugin's subagents alone can't be used; and the kit's `Bash` decision and reply-language line don't see them (one listing `Bash` would be refused if no code subagent lists it; one without `tools` inherits everything).
  - So the kit would read its plugins' `agents/*.md` (frontmatter `name`, `tools`, `model`) and register them as it does code subagents: in the allow-list as `<plugin>:<name>`, in the `Agent`/`Bash` decision; and, for a non-built-in extension, decide whether its subagents are allowed at all.

## Acceptance

- The SDK's permission rules are probed, and the ADR is written with the decisions above.
- Captain Whiskers runs with a built-in extension and one installed from a local test marketplace: pinned in a lock, verified by hash, confirmed, loaded from the store; its MCP server starts with a clean environment (a test shows it doesn't see `CLAUDE_CODE_OAUTH_TOKEN` nor other variables); its hooks don't run; the approval and file scope gates apply to its tools.
- A skill that requires a missing capability isn't offered; enabling the extension that provides it offers it.
- The knowledge base works as a built-in extension, and Captain Whiskers runs on it.
- `verify` passes; the docs have a guide on extensions (for agent authors and for extension authors).
