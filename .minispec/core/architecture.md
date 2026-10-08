# Architecture

## Flow

```
consumer's AgentSpec + config -> buildSessionOptions() -> SDK Options (tools, hooks, MCP, plugins, agents)
createInputQueue() (multi-turn) -> runQuery() -> AgentEvent stream -> chat controller (src/chat) -> its views (runChatInk/runChatTui; web and desktop next), or the caller's own UI (progress view/console renderer)
```

## Two layers (ADR-001)

- `src/core/` — never touches `console.*`, `process.stdout` or `readline`; usable from any Node host.
- `src/chat/` — the chat's logic without an interface (ADR-026): the chat controller, the runs, the history, `/extensions`. No terminal: the terminal chats in `src/tui/` are views of it, and so will be the web and desktop ones.
- `src/extensions/<name>/` — the kit's internal extensions (ADR-025): `awareness`, `knowledge`, `sources`, `memory`. Like the core, no terminal. They import the core; the core imports them only through `src/core/extensions.ts`, and no extension imports another (an ESLint rule enforces both).
- `src/tui/` — the only code that assumes a terminal (`readline`, `picocolors`, `@inquirer/prompts`, Ink).
- `src/index.ts` — the only file importing from both, and the whole public API (ADR-011).

## Key pieces (`src/core/`)

- `agentSpec.ts` — `AgentSpec<TConfig>`: system prompt, MCP servers, plugin roots, subagents, disallowed tools, approval/intervention texts. `BaseSessionConfig` + `Mode` (ADR-002).
- `pluginAgents.ts` — a plugin's subagents (`agents/*.md`, named `<plugin>:<frontmatter name>` by the SDK), read so the session registers them like `buildSubagents()`'s: allowed, counted for `Agent`/`Bash`, with the reply line (a definition under the same key in `options.agents` replaces the plugin's, confirmed empirically).
- `extensions.ts` — the extension interface (`Extension`: its name, its plugin, `missing()`, `contribute()`; `ExtensionContribution`: MCP servers, prompt section, file tools and folders, read-only and self-asking tools, hooks, chat labels, help lines, the host's API; `ExtensionContext.session()`, the session's facts read live), the manifest (`plugin.json`'s `"agent-kit"` key: `provides`, `requires`), the registry of the kit's (`awareness`, `knowledge`, `sources`, `memory`), `resolveExtensions()` (the spec's `extensions`, minus those missing something or requiring a capability nothing active provides), the prompt's Extensions section, and skills left out by their `requires:` (ADR-025).
- `externalExtensions.ts` — installed extensions (#37): the two scopes (`extensionDirs`: the agent's, the project's, which wins) and their locks (`extensions.lock.json`: source, commit, SHA-256, enabled); `addExtension()` (a folder, or a git clone at a ref; never a script), `removeExtension()`, `setExtensionEnabled()`; `loadExternalExtensions()` turns each enabled one whose hash and `kit` range check out into an `Extension` (`external: true`) from its manifest: its servers from the plugin's `.mcp.json` (#38), each through `assets/extension-launcher.mjs` (Node only, the system's variables and its `env`), read-only tools, labels, help.
- `session.ts` — `buildSessionOptions()`: resolves `spec.extensions` and puts the active ones' contributions together (it names none of them); `knowledgeDir` no extension claims is the agent's own notes; tools, hooks and MCP servers per mode, the session's `ModeControl` (guided, interactive and plan live, ADR-016, ADR-023), `settingSources`/`skills`/auto-memory defaults (ADR-018), the reply language line (ADR-019) and, with `run`, the run store (ADR-020); `createInputQueue()`.
- `packaged.ts` — running packaged (#42): `outsideArchive()` (a path inside Electron's `app.asar` as its unpacked copy, for whatever another process opens: plugins, the extension launcher) and `unpackedClaudeExecutable()` (the SDK's CLI binary unpacked, for `pathToClaudeCodeExecutable`).
- `language.ts` — `resolveLanguage()`: `--language`, option, system, English; the reply language line.
- `messages/` — the kit's texts per language (`en` complete, `es`/`fr`/`de` falling back to it), the process's current language (`chooseLanguage()`, `setLanguage()`, `t()`) (ADR-019).
- `runs.ts` — run folders: `createRunStore()` (a `SessionStore` in the run folder), `listRuns()`, `readConversation()` (ADR-020).
- `runner.ts` — `runQuery()`: SDK messages to `AgentEvent` (`text`, `action`, `subagent-action`, `mcp-error`, `info`, `turn-end` with cumulative `usage`, `prompt-suggestion` after its turn-end, `tool-result` paired with its action); subagent tool calls are kept apart from `action`; check `failed`, not `status`; `contextUsage()` for the context window in use.
- `hooks/subagentBashGate.ts`, `subagentTypeGate.ts`, `subagentForegroundGate.ts` — subagent security (ADR-003).
- `interaction.ts` — `InteractionPort`, the UI side of checkpoints; `setInteractionPort()` (ADR-013).
- `hooks/humanInput.ts` — `askForDecision()`, `askForManualIntervention()`: port vs response file (ADR-004).
- `hooks/stepGate.ts` — interactive mode: pause before every tool call (registered outside autonomous, active only while the mode is interactive).
- `hooks/planGate.ts` — plan mode: only reading, the declared plan files and read-only tools (registered outside autonomous, active only while the mode is plan; ADR-023).
- `tools/humanApproval.ts` — `request_human_approval`, `ask_human` (a choice, `askForChoice()`), and `present_plan` (leaves plan mode with the person's approval); not in autonomous mode.
- `modeControl.ts` — `ModeControl` (`subscribe()` for UIs), `createModeControl()`, `togglePlanMode()`.
- `tools/manualLogin.ts` — `request_manual_login`, only with `manualInterventionTexts` (ADR-005).
- `mcpPermissions.ts` — `allowAnyMcpTool` as `canUseTool` (ADR-006).
- `hooks/fileScopeGate.ts` — file tool boundary (ADR-007).
- `todos.ts` — the SDK's `TodoWrite` task list, in every session: `parseTodos()`, `todoChanges()`; the chats draw the list instead of the calls.
- `tools/time.ts` — `current_time`, `date_math` (server `time`), in every session and mode; `config.timeZone` or the system's.
- `sessionFacts.ts` — `SessionFacts`, what a session is at the moment it's asked (#43): `buildSessionOptions()` builds the view (identity, versions, extensions and their servers, what's off, subagents, skills; the mode read from `ModeControl`) and ties it to the options under a symbol, so it survives a spread; `runQuery()` attaches the running session (its tools and skills from `init`, `supportedCommands()`, `getContextUsage()`). Extensions read it through `ExtensionContext.session()`.
- `hooks/transcriptLogger.ts` — `transcript.jsonl`: secrets and the OAuth token redacted, long strings and base64 payloads summarized.
- `claudeAuth.ts` — `resolveClaudeAuth()`: pure lookup, no I/O (ADR-009).
- `toolLabels.ts`, `promptTemplate.ts` — friendly tool labels, prompt loading.

## Key pieces (`src/extensions/`)

- `knowledge/` — `index.ts` (the extension: needs `knowledgeDir`); `prompt.ts` (its prompt section, with the person's preferences, and its plugin root); `knowledgeStore.ts` (`KnowledgeStore`, `PageType`, the kit's page types: summary, concept, entity, synthesis, preference); `fileKnowledgeStore.ts` (the store over markdown files: index generated, backlinks computed, links as ids to the tools and relative paths on disk); `tools.ts` (the `knowledge_*` tools, ADR-024).
- `sources/` — `index.ts` (the extension: needs `sourcesDir`); `tools.ts` (the sources folder's tools, `list_sources`, `save_to_sources`, `download_to_sources`, `extract_text`, and `request_file`, `retire_source` outside autonomous; its prompt section); `sources.ts` (their manifest, `sources/.agent-kit/sources.json`: statuses, `changedAt`, duplicates, versions and retiring); `extractText.ts` (DOCX/PPTX/XLSX to markdown, optional `mammoth`, `fflate`).
- `awareness/` — what the agent knows of itself (#43): `index.ts` (the extension: needs `spec.identity`; the "Who you are" prompt section); `tools.ts` (`about_me`: `SessionFacts` as markdown, or `spec.helpGuide`).
- `memory/` — the memory of the person (#34): `index.ts` (the extension: needs `memoryDir`, a folder of the agent's own outside any project; its prompt section with the index; a `UserPromptSubmit` hook that hears the person); `memoryStore.ts` (one markdown file per entry: name, description, type `user`/`feedback`, `updated`; `remember()` creates one or changes only what's given, a field or one exact phrase of the body); `tools.ts` (`recall`, `remember`, which takes a quote that must be in the person's messages, and `forget`, #36).
- Each has `labels.ts`: its tools' chat labels in the kit's languages.

## Key pieces (`src/chat/`)

- `chatController.ts` — `createChatController()` (#39): opens the session (the first run, `--continue`), reopens it (`/extensions`) or switches to another (`/resume`), one event reader per session (ADR-010), the person's lines (exit, the chat's commands, the view's own, unknown slash commands, turns), the mode, the session log (the console's text) and the history. It publishes a plain-data `ChatState` (the transcript in blocks, busy, mode, todos, context, commands, a `panel` with `panels: "state"`, a `choice` without `pick`) and `ChatEvent`s for views that draw as they go. `runQuery` can be replaced (tests).
- `runs.ts` — `SessionOpener`, the first run (`--continue`), run labels for `/resume`.
- `history.ts` — the history file, `slashCommandToken()`.
- `extensions.ts` — `/extensions` (`chatExtensionsCommand()`), an installed extension's line.

## Key pieces (`src/tui/`)

- `extensionCommand.ts` — `runExtensionCommand()` (the `extension list|add|remove|enable|disable` command an agent mounts in its binary) and `chatExtensionsCommand()` (`/extensions` in both chats: enabling or disabling reopens the session on the same run).
- `chatTui.ts` — `runChatTui()`: the plain view of the chat controller (readline, the console renderer, Esc to interrupt, `/resume` as a numbered list); registers its readline via `setSharedReadline()`; `drainTurn()` (ADR-010).
- `language.ts` — `applyLanguage()`: chooses the kit's language for an entry point and shows the warnings.
- `consoleRenderer.ts` — `createConsoleRenderer()`: prints events, shared by chat and one-shot runs.
- `terminalInteraction.ts` — `terminalInteractionPort`, the default port installed by `index.ts`; `setSharedReadline()` for the chat's interface.
- `claudeAuth.ts` — `ensureClaudeAuth()`: offers `claude setup-token`, returns a new token for the caller to persist.
- `theme.ts` — the color theme by roles, its defaults and `setTheme()`; `ui.ts` — the palette (`ui` namespace), each function drawing its role in the current theme (ADR-021). `ink/inkTheme.tsx` — `KitTheme`, `@inkjs/ui`'s components in the theme.
- `ink/` — the Ink UI (ADR-014): `runChatInk()` (the Ink view of the chat controller: `/resume` picks in place of the prompt, `/copy`, Shift+Tab), `createProgressView()`, `runWizard()`; `sessionModel.ts` (the screen built from the controller's events), `markdown.ts` (markdown to terminal lines), `toolGroup.ts` (folded tool calls), `inkInteraction.ts` (the Ink port), `SessionView.tsx` (history, live line, spinner, approval panel, status bar; inline or full screen), `PromptInput.tsx`, `fullscreen.ts` (alternate screen, mouse, scroll view; ADR-015), `header.ts` (title, fields and logo).

## Modes

- `interactive` — step gate before every tool call.
- `guided` — approval tool before hard-to-undo or visible actions.
- `autonomous` — no human-in-the-loop tools.
- `plan` — plan gate: only reads and plans until the human leaves it.

## File tools

With `knowledgeDir` and/or `sourcesDir`, `cwd` = `projectDir`. With the built-in knowledge base reached through its tools (the default, ADR-024), `knowledgeDir` is tools-only: no file tool reaches it; `Read`/`Glob`/`Grep` are for `sourcesDir` and `extraWritableDirs`, `Write`/`Edit` for the latter. With `knowledgeBase: false` (`knowledgeDir` as the agent's own notes), all five, writes only in `knowledgeDir` + `extraWritableDirs`; `Grep` in those plus `sourcesDir`. `deniedPaths` never, nor the SDK's credentials. `Read`/`Glob` reach only the searchable folders (plus `extraReadableDirs`), the run folder, the plugin roots, the project's `.claude/` and the SDK's `tool-results/` for the project (ADR-007). `sourcesDir` grows only through the sources tools (never overwriting, no duplicates) and shrinks only through `retire_source`, which moves an original to `.agent-kit/retired/` with the person's approval.

## Sources and the knowledge base

Each owns its data, and the model connects them with their tools (#30): neither imports the other nor reads the other's files. The sources know their originals and when each one's content last changed (`changedAt`; hashes never leave `sources.ts`); the knowledge base knows its pages, which original a summary is about (`file`) and when it was written (`ingested`, set by the store). The model compares the dates with `date_math` and, after `retire_source`, retires or supersedes summaries with the knowledge tools. The sources have their own prompt section, with or without a knowledge base. The same rule holds for any two extensions (ADR-025).

## The extensions' plugins

Each internal extension's plugin is in `extensions/<name>/`, shipped as is (`tsc` copies no markdown); every one has at least its manifest (ADR-025). `extensions/sources/` (name `sources`): only the manifest. `extensions/awareness/` (name `awareness`): the `help` skill, how the kit's chat is used (checked against the chat's commands and keys by a test). `extensions/knowledge/` (name `knowledge`): skills `knowledge-ingest`, `knowledge-query`, `knowledge-lint` over the `knowledge_*` tools; commands `/knowledge:ingest`, `/knowledge:query`, `/knowledge:lint`. Opt out with `spec.knowledgeBase: false`.

## Folder map

- `src/core/`, `src/tui/`, `src/index.ts` — the library.
- `src/extensions/` — the internal extensions' code; `extensions/` — their plugins; `assets/` — the installed extensions' launcher. All shipped with the package.
- `test/` — `node:test` suites mirroring `src/`.
- `examples/captain-whiskers/` — toy consumer.
- `docs/` — the documentation site (Docusaurus, its own npm project): guides in `content/`, the API reference generated from `src/` (ADR-022); published to GitHub Pages by `.github/workflows/docs.yml`.
- `.claude/skills/` — skills for developing this repo.
- `.minispec/` — this specification.
