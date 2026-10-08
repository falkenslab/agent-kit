# ADR-025: Extensions on Claude Code plugins and marketplaces

## Decision

An agent on the kit is the kit's core plus the extensions it enables, plus its configuration. An **extension** is a Claude Code plugin (`.claude-plugin/plugin.json`, skills, commands, agents, `.mcp.json`) with the kit's data under its own key in the manifest. A **repository** of extensions is a Claude Code marketplace (`marketplace.json`). The kit provides the mechanism: formats, enabling, loading, the installer, the store, the lock, trust and isolation. Each agent provides the policy: which extensions it ships and enables, its capabilities and their contracts, and its official repository.

- **Two ways to run, one way to manage.**
  - Every extension is declared and enabled the same way.
  - Those shipped in a package (the kit's or the agent's) are **internal**: they run in the agent's process and may hook into internals (an injectable store, the person's panels, the gates).
  - Those from a repository, or the project's own, are **external**: their tools are MCP servers in another process, started by the kit with a clean environment. They get no in-process code and no hooks of their own (`settings.disableAllHooks`), and are reached by the gates by tool name.
  - Where an extension comes from decides how it runs; its author can't choose. Being internal doesn't make an extension mandatory.
- **The kit's internal extensions are knowledge, sources and memory (#34), and awareness (#43).** They need what only the process gives. The options they replace go (`knowledgeBase`, and `knowledgeDir`/`sourcesDir` turning them on by themselves).
- **Never extensions: the core.**
  - The modes and their gates (approvals, `ask_human`, `present_plan`, the step, plan and file scope gates);
  - subagents and their three gates;
  - the transcript, languages, run folders and resuming;
  - the chats.
  - agent-help was here at first; it becomes the awareness extension (decided 7 October 2026, #43): what the agent knows of itself is optional like any other ability, and it needs a live view of the session (the mode now, the extensions and their tools, the context), which the core gives every extension read-only, rather than a snapshot written when the session opens. The view rides on the options `buildSessionOptions()` returns, under a symbol (a spread keeps it, the SDK ignores it), and `runQuery()` attaches the running session to it, so no host passes anything (confirmed empirically: a session reads its tools, commands and context from inside a tool call).
- **Capabilities.**
  - An extension `provides` capabilities and `requires` capabilities, never another extension by name.
  - With nothing enabled providing a requirement, an extension stays inactive and the agent says why.
  - A skill may `requires:` a capability and is offered only when one is enabled.
  - The kit knows what a capability is, not what any one means: names and contracts are the agents'.
  - An extension names no agents, only a range of agent-kit versions: any agent on those versions that asks for its capability can use it.
- **Each extension owns its data**, and the model connects extensions through their tools (#30).
  - None reads or writes another's data, in code or on disk.
  - The model carries only short identifiers and dates; comparisons that must be exact are a tool's (`date_math`).
- **Installed in two scopes** (changed 7 October 2026, #37: it replaces one store in the user's home plus a project file):
  - The agent's, `~/.<agent>/extensions/`, for all its projects, and the project's, `<projectDir>/extensions/`, for that one, which wins over the agent's. Like Claude Code's plugin scopes. The agent passes them (`BaseSessionConfig.extensionDirs`).
  - Each scope has a lock, `extensions.lock.json`: per extension its source (a folder, or a git URL and its commit), a SHA-256 over its files, and whether it's enabled. The hash is checked when it loads: a changed file leaves the extension off, saying why.
  - Installing copies the files (or clones at a ref); it never runs a script. Secrets live apart (`.env`), passed only to the extension that declares them.
  - Each agent exposes the command in its own binary (`captain extension add …`), from the kit's `runExtensionCommand()`: the agent knows its name and folders, and the person needn't know the kit.
  - Machine requirements are the manifest's `needs` (programs on the `PATH`), checked when it loads: without one it's off, saying which (built 8 October 2026, #49). Capabilities (`requires`) stay what other extensions provide.
- **Turning an installed extension off and on in a running session** (built 8 October 2026, #49), without reopening it, when it was running when the session opened: `toggleMcpServer()` for its servers and `reloadPlugins()` on a copy of its plugin in the run's folder, emptied and filled again (both confirmed empirically; `setMcpServers()` doesn't remove a starting server). The kit's lists the gates, the chat and `about_me` read change in place, and the model is told with the next message. One that wasn't running (no plugin path the session knows), or whose files changed, takes reopening the session, as before.
- **Repositories and trust** (built 8 October 2026, #29):
  - A repository is a Claude Code marketplace as it is (`.claude-plugin/marketplace.json`). The kit installs its folder, `github`, `url` and `git-subdir` sources; `npm` and `archive` not yet, and `command` never (it runs the marketplace's program on the person's machine). A relative source with `..` is refused, as Claude Code does.
  - An agent's known marketplaces live in its agent scope (`marketplaces.json`, a copy of each in `.marketplaces/`); installing from one goes through `addExtension()`, the same copy, hash and lock, recording `<plugin>@<marketplace>`.
  - One official repository per agent (`runExtensionCommand()`'s `official`): known without asking, installed from without a question; a folder one is copied afresh every time, since it's the agent's own code.
  - Others are added only by hand, after a warning and typing the marketplace's name; installing from one asks again. Names are Claude Code's, `<plugin>@<marketplace>`, the marketplace left out when only one offers the name. The exported functions ask nothing: a host with its own interface asks the person itself.
  - Whatever the source, the kit keeps: the approvals; every MCP tool treated as publishing unless confirmed read-only; secrets only to the extension that declares them; a clean environment for its processes; tool results framed as data.
- **Official extensions are Node, bundled when published.**
  - The official repository's CI bundles each one's MCP server into one file with its dependencies (esbuild), with no native dependencies.
  - The kit starts it with `process.execPath` through the launcher. No install script ever runs.
  - A third-party extension that isn't bundled is the exception: `npm ci --ignore-scripts` in the store, after the same confirmation.
  - The builder starts as a script and a workflow in the official repository, and moves into the kit when a second repository needs it.
- **How the model learns an extension**, in layers:
  - its tools' descriptions (what and when);
  - its MCP server's `instructions` (what for, and its rules: short, always in context);
  - its skills (procedures, loaded on demand);
  - a short "active extensions" section the kit composes from the manifests.
- **A plugin's subagents** (`agents/*.md`, loaded by the SDK as `<plugin>:<name>`, the name from the frontmatter, not the file) are registered like the code's (re-declared in `options.agents`, which replaces the plugin's definition, confirmed empirically): in the type gate's allow-list, in the `Agent`/`Bash` decision, and with the reply-language line. An external extension's get no `Bash` unless the person accepted it.
- **An extension labels its own tools** for the chat (`ExtensionContribution.toolLabels`, by full tool name: a line from the input and the phrase for a folded group), in the kit's languages; the core's catalogs name none of its tools. `buildSessionOptions()` hands them back, and the chats take them from the session opener, before the agent's `formatAction`. An external extension's will come from its manifest.
- **An internal extension may bring SDK hooks** (`ExtensionContribution.hooks`), run after the kit's own: the memory hears the person's messages with `UserPromptSubmit` (it fires for every message of the streaming input, confirmed empirically), so what it saves must quote them. External extensions get none.
- **Enabling or disabling an extension reopens the session**, keeping the conversation: `/extensions enable|disable <name>` in the chat, or the command between runs. Hot reloading comes later.
- **An installed extension is a Claude Code plugin as it is** (#38): its MCP servers come from its own `.mcp.json` (or `plugin.json`'s `mcpServers`), started by the kit through its launcher, Node only. Its manifest's `"agent-kit"` key is optional and says what an internal one's code does: `readOnlyTools`, `labels` (per tool and language), `help`, capabilities, and `kit` (the agent-kit versions it works with). What it's for and its rules go in its servers' `instructions`.
- **SDK first**: before building a mechanism, check the SDK and Claude Code. If it exists, use it; if it exists only in the CLI, adopt its format and build only the missing part.

## Motivation

- Designed in miyagi (its ADR-020), but almost nothing in it is domain-specific: built there, padawan would copy it, and security would live in two places. It's the split the file scope already follows (#28): mechanism in the kit, policy in the agent.
- Not every user needs the same abilities. A small core that specialises through extensions avoids an agent with everything for everyone, and an unneeded extension costs nothing: the kit's own parts cost 2–3k input tokens per call each, measured.
- Claude Code's formats already exist and are validated (`claude plugin validate`, `claude plugin tag`). The SDK loads local plugins but has no marketplaces, installs, versions or trust prompts: the kit builds only that part.
- Probed (SDK 0.3.283):
  - host hooks deny plugin tools before the plugin's server sees the call;
  - `disableAllHooks` stops a plugin's hooks but not the host's;
  - `env` doesn't isolate a server's environment (merged with the process's), hence the launcher;
  - MCP `instructions` reach the model, at start and when added mid-session;
  - `setMcpServers()` and `reloadPlugins()` add and remove tools, skills and subagents mid-session, but `plugins` paths and a `skills` list are fixed at start;
  - a plugin's subagents are blocked by the kit's type gate unless listed.
- Rejected:
  - **All extensions external, the kit's included.** One way to run, but the knowledge base would lose its injectable store, `request_file` its panel, and sources and knowledge their in-process link; isolating the kit's own reviewed code buys nothing.
  - **Extensions naming the agents they serve.** They depend on the kit's API and on capabilities, not on an agent.
  - **Dependencies between extensions by name.** A tree to resolve, with conflicts.
  - **Each agent's own project file.** Each would reimplement reading it and the lock.
  - **One store in the user's home, shared by every agent** (the first version of this ADR). An extension installed for one agent would be one step from all of them; per agent and per project matches how Claude Code scopes plugins.
  - **A community catalog.**
  - **The SDK's permission rules instead of the kit's file scope and plan gates.** Probed:
    - a `deny` on `Read` also stops `Glob` and `Grep`, and a `Grep` from above skips the denied files;
    - but there's no allow-list: the working directory is always readable, and `deny` wins over `allow`;
    - the denials don't say what to use instead, and `dontAsk`'s invites the model to try other tools;
    - on Windows, `Read(//C:/…)` silently matches nothing (`Read(C:/…)`, `Read(//c/…)` and `Read(./…)` work);
    - `permissionMode: "plan"` is Claude Code's own workflow (a plan file in `~/.claude/plans/`, `ExitPlanMode`), not a gate the kit can shape.

## Consequences

- **Layout of the internal extensions** (decided 6 October 2026):
  - Each extension's code goes in `src/extensions/<name>/` (knowledge, sources, memory), compiled by `tsc`.
  - Its plugin goes in `extensions/<name>/`, shipped as is (`tsc` copies no markdown).
  - Every extension has a plugin, at least its manifest: the manifest is what makes it an extension. Today `sources` has only the manifest; `knowledge` has its skills and commands (today's `assets/knowledge-plugin/`); `memory` has its commands for the person (`/memory:list`, `/memory:forget`) and, at first, no skills (its rules are short and go in its prompt section).
  - `src/core/` keeps the core plus the extension interface and the registry of the internal extensions (`src/core/extensions.ts`); it imports no extension but through that registry, and no extension imports another. An ESLint rule (`no-restricted-imports`) enforces both.
  - The move and the interface come together, as the first commit of phase 2: moving the files alone would change imports and nothing else.

- Phases, each with its own note:
  1. this ADR;
  2. knowledge and sources (then memory) as internal extensions, with the manifest, enabling and the project file;
  3. external extensions: the two scopes and their locks, the command, the launcher, `/extensions` (#37); then marketplaces, trust and the builder;
  4. hot reloading.

  The agents adopt each on their own; no backward compatibility is kept while 0.x.
- A skill's `requires:` is honoured with the `skills` list: the SDK's `skillOverrides` doesn't reach plugin skills (confirmed empirically: an "off" plugin skill is still listed and launched), so leaving one out turns `"all"` into a list of the plugins' and the project's skills.
- `skills: "plugins"` computes its list at start: it stays for now, and hot reloading moves it to `"all"` with `disableBundledSkills`.
- The kit's rules (the file scope's folders, plan mode's read-only tools, labels, the `Bash` decision, the subagent allow-list) are computed when a session opens. Hot reloading will need them in a registry the hooks read on every call.
- The file scope and plan gates stay hooks (ADR-007, ADR-023). The SDK's `deny` rules are a second layer for `deniedPaths` and the SDK's credentials (built 8 October 2026, #49): `Read` and `Edit` rules for each path and its contents, in the `//` POSIX form an absolute path needs (confirmed empirically on Windows).
- Always-on parts become capabilities an agent enables, through the same mechanism rather than loose switches: the task list (#27), the clock and the web.
