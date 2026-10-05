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
3. **The knowledge base and the sources tools as built-in extensions**, with the same manifest: page types from extensions; an agent without a knowledge base doesn't enable it (instead of `knowledgeBase: false`, kept for compatibility).
4. **miyagi adopts it** (its own repo's work): its features shrink to its built-ins, classroom contracts, official repository and project file. padawan and Captain Whiskers too.

Must not break padawan and miyagi: every phase is opt-in until a breaking release.

## Open questions

- One extension for several agents (declaring which), or each agent its own?
- Dependencies between non-built-in extensions: forbidden, or flat?
- The shareable project file: one name and format for every agent, or each agent's own?
- Subagents declared by a plugin (`agents/*.md`): today the kit only knows those from `AgentSpec.buildSubagents()`, and only those get the `Agent` tool, the type gate's allow-list, the `Bash` decision (#25) and the reply-language line; Captain Whiskers declares his in code for that reason (and because his prompts use his name in the kit's language). To verify in code: whether the SDK loads a local plugin's `agents/`, under what names (`<plugin>:<agent>`?), and how the kit would register them through the same gates.
- Does the file scope move to the SDK's permission rules (`Read(//path/**)`, `dontAsk`), and does the plan gate give way to `permissionMode: "plan"`? To verify in code: a deny rule on `Read` stopping `Glob`/`Grep`; `setMcpServers()` on a running session (enabling an extension without reopening).

## Acceptance

- The ADR is written, with the open questions settled.
- Captain Whiskers runs with a built-in extension and one installed from a local test marketplace: pinned in a lock, verified by hash, confirmed, loaded from the store; its MCP server starts with a clean environment (a test shows it doesn't see `CLAUDE_CODE_OAUTH_TOKEN` nor other variables); its hooks don't run; the approval and file scope gates apply to its tools.
- A skill that requires a missing capability isn't offered; enabling the extension that provides it offers it.
- The knowledge base works as a built-in extension, and padawan and miyagi run unchanged on the release that ships it.
- `verify` passes; the docs have a guide on extensions (for agent authors and for extension authors).
