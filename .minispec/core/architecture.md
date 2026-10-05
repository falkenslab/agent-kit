# Architecture

## Flow

```
consumer's AgentSpec + config -> buildSessionOptions() -> SDK Options (tools, hooks, MCP, plugins, agents)
createInputQueue() (multi-turn) -> runQuery() -> AgentEvent stream -> caller's UI (runChatInk/runChatTui, progress view/console renderer, desktop app)
```

## Two layers (ADR-001)

- `src/core/` — never touches `console.*`, `process.stdout` or `readline`; usable from any Node host.
- `src/tui/` — the only code that assumes a terminal (`readline`, `picocolors`, `@inquirer/prompts`, Ink).
- `src/index.ts` — the only file importing from both, and the whole public API (ADR-011).

## Key pieces (`src/core/`)

- `agentSpec.ts` — `AgentSpec<TConfig>`: system prompt, MCP servers, plugin roots, subagents, disallowed tools, approval/intervention texts. `BaseSessionConfig` + `Mode` (ADR-002).
- `session.ts` — `buildSessionOptions()`: tools, hooks and MCP servers per mode, the session's `ModeControl` (guided, interactive and plan live, ADR-016, ADR-023), `settingSources`/`skills`/auto-memory defaults (ADR-018), the reply language line (ADR-019) and, with `run`, the run store (ADR-020); `createInputQueue()`.
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
- `hooks/fileScopeGate.ts` — file tool boundary (ADR-007); `tools/saveToSources.ts` — the sources folder's tools (`list_sources`, `save_to_sources`, `download_to_sources`; `request_file`, `retire_source` outside autonomous); `extractText.ts` — DOCX/PPTX/XLSX to markdown for `extract_text` (optional `mammoth`, `fflate`); `sources.ts` — their manifest (`sources/.agent-kit/sources.json`), statuses, duplicates, versions and retiring.
- `todos.ts` — the SDK's `TodoWrite` task list, in every session: `parseTodos()`, `todoChanges()`; the chats draw the list instead of the calls.
- `tools/time.ts` — `current_time`, `date_math` (server `time`), in every session and mode; `config.timeZone` or the system's.
- `knowledge.ts` — knowledge base prompt section (tools or files variant) and plugin roots (ADR-008).
- `agentHelp.ts` — with `spec.identity`: the "Who you are" prompt section (name, version, agent-kit's version) and the `agent-help` plugin, written into the run's folder from `assets/agent-help/SKILL.md` (the chat's part, checked against the chat's commands and keys by a test), this session's facts and `spec.helpGuide`.
- `knowledgeStore.ts` — `KnowledgeStore`, `PageType`, the kit's four page types and their templates; `fileKnowledgeStore.ts` — the store over markdown files (index generated, backlinks computed, links as ids to the tools and relative paths on disk); `tools/knowledgeTools.ts` — the `knowledge_*` tools (ADR-024).
- `hooks/transcriptLogger.ts` — `transcript.jsonl`: secrets and the OAuth token redacted, long strings and base64 payloads summarized.
- `claudeAuth.ts` — `resolveClaudeAuth()`: pure lookup, no I/O (ADR-009).
- `toolLabels.ts`, `promptTemplate.ts` — friendly tool labels, prompt loading.

## Key pieces (`src/tui/`)

- `chatTui.ts` — `runChatTui()`: multi-turn chat on `createInputQueue()` + `runQuery()`, history, Esc to interrupt, session log; registers its readline via `setSharedReadline()`; `drainTurn()` (ADR-010). Takes options or, with `runsDir`, a session opener, for `--continue` and `/resume` (ADR-020).
- `runs.ts` — `SessionOpener`, the first run (`--continue`), run labels for `/resume`.
- `language.ts` — `applyLanguage()`: chooses the kit's language for an entry point and shows the warnings.
- `consoleRenderer.ts` — `createConsoleRenderer()`: prints events, shared by chat and one-shot runs.
- `terminalInteraction.ts` — `terminalInteractionPort`, the default port installed by `index.ts`; `setSharedReadline()` for the chat's interface.
- `claudeAuth.ts` — `ensureClaudeAuth()`: offers `claude setup-token`, returns a new token for the caller to persist.
- `theme.ts` — the color theme by roles, its defaults and `setTheme()`; `ui.ts` — the palette (`ui` namespace), each function drawing its role in the current theme (ADR-021). `ink/inkTheme.tsx` — `KitTheme`, `@inkjs/ui`'s components in the theme.
- `ink/` — the Ink UI (ADR-014): `runChatInk()` (with `runsDir`, as `runChatTui()`; `/resume` picks in place of the prompt), `createProgressView()`, `runWizard()`; `sessionModel.ts` (the screen built from events, the log through the console renderer), `markdown.ts` (markdown to terminal lines), `toolGroup.ts` (folded tool calls), `inkInteraction.ts` (the Ink port), `SessionView.tsx` (history, live line, spinner, approval panel, status bar; inline or full screen), `PromptInput.tsx`, `fullscreen.ts` (alternate screen, mouse, scroll view; ADR-015), `header.ts` (title, fields and logo).

## Modes

- `interactive` — step gate before every tool call.
- `guided` — approval tool before hard-to-undo or visible actions.
- `autonomous` — no human-in-the-loop tools.
- `plan` — plan gate: only reads and plans until the human leaves it.

## File tools

With `knowledgeDir` and/or `sourcesDir`, `cwd` = `projectDir`. With the built-in knowledge base reached through its tools (the default, ADR-024), `knowledgeDir` is tools-only: no file tool reaches it; `Read`/`Glob`/`Grep` are for `sourcesDir` and `extraWritableDirs`, `Write`/`Edit` for the latter. With `knowledgeBase: false` (`knowledgeDir` as the agent's own notes), all five, writes only in `knowledgeDir` + `extraWritableDirs`; `Grep` in those plus `sourcesDir`. `deniedPaths` never, nor the SDK's credentials. `Read`/`Glob` reach only the searchable folders (plus `extraReadableDirs`), the run folder, the plugin roots, the project's `.claude/` and the SDK's `tool-results/` for the project (ADR-007). `sourcesDir` grows only through the sources tools (never overwriting, no duplicates) and shrinks only through `retire_source`, which moves an original to `.agent-kit/retired/` with the person's approval.

## Sources and the knowledge base

Each owns its data, and the model connects them with their tools (#30): neither imports the other nor reads the other's files. The sources know their originals and when each one's content last changed (`changedAt`; hashes never leave `sources.ts`); the knowledge base knows its pages, which original a summary is about (`file`) and when it was written (`ingested`, set by the store). The model compares the dates with `date_math` and, after `retire_source`, retires or supersedes summaries with the knowledge tools. The sources have their own prompt section, with or without a knowledge base. The same rule holds for any two extensions (#29).

## Knowledge plugin

`assets/knowledge-plugin/` (name `knowledge`): skills `knowledge-ingest`, `knowledge-query`, `knowledge-lint` over the `knowledge_*` tools; commands `/knowledge:ingest`, `/knowledge:query`, `/knowledge:lint`. Opt out with `spec.knowledgeBase: false`.

## Agent help plugin

Generated per session in `<runDir>/agent-help/` (name `agent-kit`, skill `agent-help`) when the spec has an `identity`, so the agent's guide goes inside the skill and needs no file tools.

## Folder map

- `src/core/`, `src/tui/`, `src/index.ts` — the library.
- `assets/knowledge-plugin/`, `assets/agent-help/` — shipped with the package.
- `test/` — `node:test` suites mirroring `src/`.
- `examples/captain-whiskers/` — toy consumer.
- `docs/` — the documentation site (Docusaurus, its own npm project): guides in `content/`, the API reference generated from `src/` (ADR-022); published to GitHub Pages by `.github/workflows/docs.yml`.
- `.claude/skills/` — skills for developing this repo.
- `.minispec/` — this specification.
