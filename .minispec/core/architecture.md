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
- `tools/humanApproval.ts` — `request_human_approval` (guided mode).
- `tools/manualLogin.ts` — `request_manual_login`, only with `manualInterventionTexts` (ADR-005).
- `mcpPermissions.ts` — `allowAnyMcpTool` as `canUseTool` (ADR-006).
- `hooks/fileScopeGate.ts` — file tool boundary (ADR-007); `tools/saveToSources.ts` — `save_to_sources`.
- `tools/time.ts` — `current_time`, `date_math` (server `time`), in every session and mode; `config.timeZone` or the system's.
- `knowledge.ts` — knowledge base prompt section and plugin root (ADR-008).
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

With `knowledgeDir` and/or `sourcesDir`: `Read`, `Write`, `Edit`, `Glob`, `Grep`, `cwd` = `projectDir`. Writes only in `knowledgeDir` + `extraWritableDirs`; `Grep` in those plus `sourcesDir`; `deniedPaths` never. `sourcesDir` grows only through `save_to_sources` (`COPYFILE_EXCL`, never overwrites).

## Knowledge plugin

`assets/knowledge-plugin/` (name `knowledge`): skills `knowledge-pages`, `knowledge-ingest`, `knowledge-query`, `knowledge-lint`; commands `/knowledge:ingest`, `/knowledge:query`, `/knowledge:lint`. Opt out with `spec.knowledgeBase: false`.

## Folder map

- `src/core/`, `src/tui/`, `src/index.ts` — the library.
- `assets/knowledge-plugin/` — shipped with the package.
- `test/` — `node:test` suites mirroring `src/`.
- `examples/captain-whiskers/` — toy consumer.
- `docs/` — the documentation site (Docusaurus, its own npm project): guides in `content/`, the API reference generated from `src/` (ADR-022); published to GitHub Pages by `.github/workflows/docs.yml`.
- `.claude/skills/` — skills for developing this repo.
- `.minispec/` — this specification.
