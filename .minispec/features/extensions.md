# Extensions on Claude Code plugins and marketplaces

Issue: [#29](https://github.com/falkenslab/agent-kit/issues/29)

## Goal

Every agent on the kit is its core plus the extensions it enables plus its configuration, and its users can install more from repositories (ADR-025).

## Context

- Decided and recorded in ADR-025 (phase 1, done): two ways to run (internal, external) and one way to manage; capabilities; each extension owns its data; per-project dependencies, store and lock; repositories and trust; bundled official extensions; how the model learns an extension; plugin subagents; reopening the session to enable one; "SDK first".
- Today: the kit loads local plugins (`AgentSpec.pluginRoots`, the knowledge and agent-help plugins) with `skipMcpDiscovery: true`; knowledge and sources turn on with `knowledgeDir`/`sourcesDir` (and `knowledgeBase: false`); there's no manifest, enabling, project file, installer, store, lock or launcher.
- Measured cost per call (Captain Whiskers): the knowledge base ~3.4k input tokens, the sources tools ~2.2k plus `Read`/`Glob`/`Grep` ~2.7k, the task list ~3.4k, the web ~1.4k, `Skill` ~1.1k, agent-help ~0.2k.

## Changes

2. **Internal extensions.** Done so far: the interface and the move (`src/core/extensions.ts`, `src/extensions/`, `extensions/`, the ESLint rule); enabling (`AgentSpec.extensions`, the kit's by name and an agent's own as objects; `knowledgeBase` gone, `knowledgeDir` no extension claims is the agent's own notes); the manifest's `"agent-kit"` key (`provides`, `requires`); resolving requirements (an extension left out when one isn't met, with why); the prompt's Extensions section; a skill's `requires:` (through the `skills` list); Captain Whiskers' own `jokebook` (a tool, a capability, a skill requiring `knowledge-base`). A plugin's subagents registered like the code's (`pluginAgents.ts`; Captain Whiskers' parrot is `jokebook:loro-critico`). Left: the tool labels declared by each extension (today in the core's catalogs); then memory (#34) and manual intervention as extensions.
3. **External extensions.** The project file and its lock; reading `marketplace.json`; downloading at a pinned commit, verifying the hash, confirming (a typed confirmation for a non-official repository), storing, locking; the launcher (`process.execPath`, a clean environment, only the declared secrets; `env` alone doesn't isolate); `skipMcpDiscovery` with the kit starting the servers, `disableAllHooks`; machine requirements; a test marketplace and extension for Captain Whiskers; the builder script and workflow for the official repository (esbuild, `claude plugin validate`, SHA-256, `claude plugin tag`). To verify: whether marketplaces accept an `npm` source.
4. **Hot reloading.** `setMcpServers()` (naming every in-process server to keep: it replaces the dynamic set, the options' in-process servers included), `reloadPlugins()` on paths declared at start (one per installed extension, filled or emptied), `skills: "all"` with `disableBundledSkills` (a `skills` list is fixed at start), `skillOverrides` to hide one; the kit's rules in a registry the hooks read on every call; a note to the model on the next message (`takeNotice`).
- Separately: the SDK's `deny` rules as a second layer for `deniedPaths` and the SDK's credentials (a `Grep` from above then skips them); the task list (#27), the clock and the web as capabilities.

## Acceptance

- Phase 2: Captain Whiskers enables knowledge and sources as extensions; an agent without them has none of their tools, prompt or skills; a skill requiring a missing capability isn't offered.
- Phase 3: Captain Whiskers runs with an extension installed from a local test marketplace: pinned in a lock, verified by hash, confirmed, loaded from the store; its server doesn't see `CLAUDE_CODE_OAUTH_TOKEN` nor other variables; its hooks don't run; the approval and file scope gates apply to its tools.
- `verify` passes; the docs have a guide on extensions, for agent authors and for extension authors.
