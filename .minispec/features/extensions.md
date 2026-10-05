# Extensions on Claude Code plugins and marketplaces

Issue: [#29](https://github.com/falkenslab/agent-kit/issues/29)

## Goal

Every agent on the kit is "the kit + a set of built-in extensions + configuration", and its users can install more from repositories, with the kit providing the mechanism (formats, installer, store, lock, trust, isolation) and each agent the policy (which extensions, its capabilities, its official repository).

## Context

- Designed in miyagi (its ADR-020; falkenslab/miyagi#33, #36, #41), but almost nothing in it is domain-specific: built there, padawan would copy it. Same split as the file scope (#28, done: `restrictReads`): mechanism in the kit, policy in the agent.
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
3. **The knowledge base and the sources tools as built-in extensions**: `sources` standalone (an agent that only gathers documents), `knowledge` optionally depending on it (ingesting, and tracking which originals are ingested, are the knowledge base's). Today the dependency also runs the other way, through the knowledge base's files: #30 fixes that first, with a link the sources tools take and the knowledge base implements over its store. Same manifest: page types from extensions; an agent without them doesn't enable them (instead of `knowledgeBase: false`, kept for compatibility). Then manual intervention; then the capabilities that are always on today (see the inventory).
4. **miyagi adopts it** (its own repo's work): its features shrink to its built-ins, classroom contracts, official repository and project file. padawan and Captain Whiskers too.

Must not break padawan and miyagi: every phase is opt-in until a breaking release.

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

## Open questions

- One extension for several agents (declaring which), or each agent its own?
- Dependencies between non-built-in extensions: forbidden, or flat?
- The shareable project file: one name and format for every agent, or each agent's own?
- Subagents declared by a plugin (`agents/*.md`): today the kit only knows those from `AgentSpec.buildSubagents()`, and only those get the `Agent` tool, the type gate's allow-list, the `Bash` decision (#25) and the reply-language line; Captain Whiskers declares his in code for that reason (and because his prompts use his name in the kit's language). Probed (SDK 0.3.283, a local plugin `probe` with `agents/echo-bot.md`):
  - the SDK loads it as `probe:echo-bot` (in the init message's `agents`, next to its own built-ins: `general-purpose`, `Explore`, `Plan`…), and with `Agent` in the tools the model delegates to it and it answers;
  - through the kit, the type gate denies it ("Delegation is only available for …") unless `allowedSubagentTypes` names it as `probe:echo-bot`; then it works;
  - the session only gets `Agent` if `buildSubagents()` returns something, so a plugin's subagents alone can't be used; and the kit's `Bash` decision and reply-language line don't see them (one listing `Bash` would be refused if no code subagent lists it; one without `tools` inherits everything).
  - So the kit would read its plugins' `agents/*.md` (frontmatter `name`, `tools`, `model`) and register them as it does code subagents: in the allow-list as `<plugin>:<name>`, in the `Agent`/`Bash` decision; and, for a non-built-in extension, decide whether its subagents are allowed at all.
- Does the file scope move to the SDK's permission rules (`Read(//path/**)`, `dontAsk`), and does the plan gate give way to `permissionMode: "plan"`? To verify in code: a deny rule on `Read` stopping `Glob`/`Grep`; `setMcpServers()` on a running session (enabling an extension without reopening).

## Acceptance

- The ADR is written, with the open questions settled.
- Captain Whiskers runs with a built-in extension and one installed from a local test marketplace: pinned in a lock, verified by hash, confirmed, loaded from the store; its MCP server starts with a clean environment (a test shows it doesn't see `CLAUDE_CODE_OAUTH_TOKEN` nor other variables); its hooks don't run; the approval and file scope gates apply to its tools.
- A skill that requires a missing capability isn't offered; enabling the extension that provides it offers it.
- The knowledge base works as a built-in extension, and padawan and miyagi run unchanged on the release that ships it.
- `verify` passes; the docs have a guide on extensions (for agent authors and for extension authors).
