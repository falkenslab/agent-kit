# @falkenslab/agent-kit

## Namespaces

| Namespace | Description |
| ------ | ------ |
| [ui](@falkenslab/namespaces/ui/index.md) | The terminal palette: one function per theme role, drawing text in the current theme. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AgentIdentity](interfaces/AgentIdentity.md) | Who an agent is, as told to its model (`AgentSpec.identity`). |
| [AgentRun](interfaces/AgentRun.md) | A running session, as `runQuery()` returns it: its events and the controls of the SDK's `Query`. |
| [AgentSpec](interfaces/AgentSpec.md) | Everything actually *about the domain* that `buildSessionOptions()` needs but doesn't decide itself: which system prompt to build, which MCP servers to talk to besides the generic human-in-the-loop/knowledge ones this kit already wires up, which local plugin roots (skills/commands) to load, and which opt-in subagents (if any) to register. |
| [ApprovalPrompt](interfaces/ApprovalPrompt.md) | What a checkpoint shows the person: a title, detail lines and, in a plain terminal, the question. |
| [AwarenessOptions](interfaces/AwarenessOptions.md) | The awareness extension's options. |
| [BaseSessionConfig](interfaces/BaseSessionConfig.md) | The minimum a config object needs to drive `buildSessionOptions()` — a concrete agent's own config type (e.g. a `Config`) extends this with whatever domain fields it needs (a course URL, credentials, ...), which `buildSessionOptions()` itself never looks at directly: only `AgentSpec`'s methods receive the full concrete config. |
| [ChatSettings](interfaces/ChatSettings.md) | What the controller needs besides the session: the chats' options it acts on. |
| [ChatState](interfaces/ChatState.md) | The chat's state: plain data, the same for any view. |
| [ChatTuiOptions](interfaces/ChatTuiOptions.md) | Options of the chats (`runChatTui()`, and `runChatInk()` through `InkChatOptions`). |
| [CheckReport](interfaces/CheckReport.md) | What `check()` finds: the mechanical problems, for the agent to fix or report. |
| [ChoiceAnswer](interfaces/ChoiceAnswer.md) | What the person chose: the options they picked, and their own answer if they gave one. |
| [ChoiceSettings](interfaces/ChoiceSettings.md) | How `askChoice()` asks: the options to pick from, and whether several can be picked. |
| [ClaudeAuthConfig](interfaces/ClaudeAuthConfig.md) | What `resolveClaudeAuth()` and `ensureClaudeAuth()` accept besides the environment. |
| [ConfirmStep](interfaces/ConfirmStep.md) | A yes/no question; the answer is a boolean. |
| [ConsoleRenderer](interfaces/ConsoleRenderer.md) | Prints `runQuery()`'s events as plain console lines (see `createConsoleRenderer()`). |
| [ConsoleRendererOptions](interfaces/ConsoleRendererOptions.md) | Options of `createConsoleRenderer()`. |
| [ContextUsage](interfaces/ContextUsage.md) | How full the session's context window is (see `AgentRun.contextUsage()`). |
| [ConversationMessage](interfaces/ConversationMessage.md) | One message of a kept conversation: something the person wrote, or the agent's text reply. |
| [Extension](interfaces/Extension.md) | An internal extension: its plugin (whose manifest gives its name, description and capabilities), what it needs from the session, and what it brings. |
| [ExtensionAuthor](interfaces/ExtensionAuthor.md) | Who made an extension, as Claude Code's `plugin.json` has it. |
| [ExtensionContext](interfaces/ExtensionContext.md) | What an extension sees of the session it's contributing to. |
| [ExtensionContribution](interfaces/ExtensionContribution.md) | What an extension brings to a session. Every part is optional. |
| [ExtensionDirs](interfaces/ExtensionDirs.md) | The two folders an agent installs extensions into; either may be left out. |
| [ExtensionManifest](interfaces/ExtensionManifest.md) | An extension's manifest, as the kit reads it. |
| [ExtensionsStatus](interfaces/ExtensionsStatus.md) | The extensions of a session: where they're installed, what's installed, what runs and what can't (with why). |
| [ExternalManifest](interfaces/ExternalManifest.md) | An external extension's manifest: its `plugin.json`, the plugin's own metadata (Claude Code's fields, which its validator checks) and the kit's key (`"agent-kit"`, which it ignores). |
| [ExternalToolLabel](interfaces/ExternalToolLabel.md) | How the chat shows one of its tools in one language: `{field}` takes the call's input. |
| [FileKnowledgeStoreOptions](interfaces/FileKnowledgeStoreOptions.md) | Options of `createFileKnowledgeStore()`. |
| [FileScope](interfaces/FileScope.md) | Where the built-in file tools may act. Without this, the only boundary is the SDK's own working-directory scope — the whole project directory — so keeping the agent out of the user's own files (a config file holding a password, the originals in sources/) would rest on the system prompt alone. |
| [HeaderInfo](interfaces/HeaderInfo.md) | The top of the Ink chat: a title, optional fields and an optional logo. |
| [HumanApprovalTexts](interfaces/HumanApprovalTexts.md) | The approval tool's texts: its description (when the model should call it) and what it returns when approved or rejected. |
| [InkChatOptions](interfaces/InkChatOptions.md) | Options of `runChatInk()`: the chat's options plus the Ink-only ones. |
| [InputStep](interfaces/InputStep.md) | A line of text. |
| [InstalledExtension](interfaces/InstalledExtension.md) | One installed extension, as the scopes and their locks list it. |
| [InteractionPort](interfaces/InteractionPort.md) | The UI side of a human-in-the-loop checkpoint: how a host shows the question and reads a person's answer. `askForDecision()` races it against the response file, so a port only covers the keyboard (or window) channel and never needs to know about the file. |
| [KnowledgeOptions](interfaces/KnowledgeOptions.md) | The knowledge base's options. |
| [KnowledgePage](interfaces/KnowledgePage.md) | One page, as the store returns it. |
| [KnowledgeStore](interfaces/KnowledgeStore.md) | Where the knowledge base lives. The kit ships one over markdown files (`createFileKnowledgeStore()`); another one (a database, a vector store) implements this interface and is passed with `AgentSpec.knowledgeStore`. Pages are never deleted or renamed: their ids are what links point to. |
| [KnowledgeToolsOptions](interfaces/KnowledgeToolsOptions.md) | Options of `createKnowledgeServer()`. |
| [KnownMarketplace](interfaces/KnownMarketplace.md) | A marketplace an agent knows. |
| [LanguageSources](interfaces/LanguageSources.md) | Where the language can come from, in order of precedence. |
| [LockEntry](interfaces/LockEntry.md) | One extension in a scope's lock. |
| [ManualInterventionTexts](interfaces/ManualInterventionTexts.md) | The manual-intervention tool's texts: for the model (`toolDescription`, `confirmedMessage`) and for the person (the checkpoint). |
| [MarketplaceManifest](interfaces/MarketplaceManifest.md) | A marketplace's `marketplace.json`, as the kit reads it. |
| [MarketplacePlugin](interfaces/MarketplacePlugin.md) | A plugin a marketplace offers. |
| [MemoryOptions](interfaces/MemoryOptions.md) | The memory's options. |
| [Messages](interfaces/Messages.md) | Every text the kit shows a person, in one language. Texts for the model (tool descriptions, hook deny reasons, the knowledge base's prompt section) aren't here: they stay in English whatever the language. |
| [ModeControl](interfaces/ModeControl.md) | The supervision mode of a running session. "guided", "interactive" and "plan" switch into one another: they share the same tools (the approval tool), and the step gate and the plan gate are registered in all three, deciding only in their own mode. "autonomous" has no approval tool at all, and a tool can't appear or vanish mid-session, so a session that starts autonomous stays autonomous, and one that doesn't can't become autonomous. The system prompt keeps the mode it was built with, so entering or leaving plan mode is told to the model with the next message instead (`takeNotice()`). |
| [NewPage](interfaces/NewPage.md) | A page to create. |
| [PageInfo](interfaces/PageInfo.md) | A page's line in a listing. |
| [PageType](interfaces/PageType.md) | A kind of page: one of the kit's, or one an agent declares (`knowledge({ pageTypes })`). |
| [PasswordStep](interfaces/PasswordStep.md) | A line of text, masked while typed and in the summary. |
| [PlanModeSpec](interfaces/PlanModeSpec.md) | The domain's part of "plan" mode: which files hold the plan and which of its own tools only read. |
| [PlanScope](interfaces/PlanScope.md) | What plan mode lets through besides reading: see createPlanGate(). |
| [PluginServer](interfaces/PluginServer.md) | One of a plugin's MCP servers, as its `.mcp.json` (or `plugin.json`'s `mcpServers`) declares it. |
| [ProgressView](interfaces/ProgressView.md) | A one-shot run's live view: a console renderer drawn with Ink, plus `close()`. |
| [ProgressViewOptions](interfaces/ProgressViewOptions.md) | Options of `createProgressView()`. |
| [ResolvedLanguage](interfaces/ResolvedLanguage.md) | The result of `resolveLanguage()`: the language to use and why any asked-for code was skipped. |
| [RunFolder](interfaces/RunFolder.md) | One run of an agent: a folder under the agent's runs folder (`<runsDir>/<timestamp>/`) holding its session log, its transcript of tool calls and, with a run store, the SDK's own transcript of the conversation, so a person can resume it later. |
| [RunSummary](interfaces/RunSummary.md) | A run that kept a conversation, as `listRuns()` lists it for a person to pick (see `/resume`). |
| [SearchHit](interfaces/SearchHit.md) | A page that `search()` found, with where it matched. |
| [SelectStep](interfaces/SelectStep.md) | A choice among `choices`; the answer is the chosen `value`. |
| [SessionFacts](interfaces/SessionFacts.md) | What a session is, at the moment it's asked (`ExtensionContext.session()`, #43): the core's facts, read-only, never another extension's data. The mode follows Shift+Tab and plan mode; the tools, skills, commands and context come from the running session once it has started. |
| [SessionUsage](interfaces/SessionUsage.md) | Running totals for the whole `query()` session so far, not for one turn: the SDK's own `total_cost_usd` and `modelUsage` are cumulative across turns in a streaming-input session, so the latest `turn-end` carries the session total (never sum them). |
| [SourcesOptions](interfaces/SourcesOptions.md) | The sources extension's options. |
| [SourceToolsOptions](interfaces/SourceToolsOptions.md) | Options of `createSaveToSourcesServer()`. |
| [Theme](interfaces/Theme.md) | The terminal UI's colors, by what they're for. |
| [ToolLabel](interfaces/ToolLabel.md) | How the chat shows one tool: an extension's, by its full name (`ExtensionContribution.toolLabels`). |
| [TranscriptCall](interfaces/TranscriptCall.md) | One tool call in the transcript. |
| [TranscriptLogger](interfaces/TranscriptLogger.md) | The two hooks that write `transcript.jsonl`: register `preToolUse` as a `PreToolUse` hook and `postToolUse` as a `PostToolUse` one. |
| [WizardOptions](interfaces/WizardOptions.md) | Options of `runWizard()`. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [AgentEvent](type-aliases/AgentEvent.md) | A transport-agnostic view of one turn's worth of output from `query()` — the same normalized shape whether the caller is going to print it to a console, forward it to a chat REPL, or serialize it over Electron IPC (a real consuming agent had four separate entry points — CLI run, CLI chat, an exploration mode and a desktop chat — that all parsed the SDK's raw message stream themselves, nearly identically). |
| [ChatController](type-aliases/ChatController.md) | A chat controller: its state, events and actions (see `createChatController()`). |
| [ChatEvent](type-aliases/ChatEvent.md) | What happens in the chat, in order, for a view that draws as it goes (a terminal). |
| [ChatPanel](type-aliases/ChatPanel.md) | A checkpoint waiting for the person's answer, with `panels: "state"`. |
| [ChatQuestion](type-aliases/ChatQuestion.md) | What a checkpoint asks: an approval, a confirmation after a manual step, free text, or a choice. |
| [ExtensionScope](type-aliases/ExtensionScope.md) | One of the two scopes an extension can be installed in: the agent's or the project's. |
| [FieldChanges](type-aliases/FieldChanges.md) | A change to a page's frontmatter fields: a string sets it, null removes it. |
| [FolderOption](type-aliases/FolderOption.md) | A folder an extension's options name: a path, or one worked out from the session's config (its project). |
| [Language](type-aliases/Language.md) | The languages the kit's own texts come in. |
| [Mode](type-aliases/Mode.md) | The human-supervision spectrum every agent built on this kit shares, independent of domain: "interactive" pauses before every single action, "guided" only pauses before a hard-to-undo/visible-to-others action, "autonomous" has no human-in-the-loop channel at all, and "plan" only reads and plans: nothing is changed until the human leaves it (see hooks/planGate.ts). See session.ts's buildSessionOptions() for exactly what each mode changes. |
| [NoticeTone](type-aliases/NoticeTone.md) | How a notice reads: plain (the agent's own text), dim (a kit's aside), a warning or an error. |
| [PluginSource](type-aliases/PluginSource.md) | Where a marketplace's plugin comes from, as `marketplace.json` says (Claude Code's forms). |
| [RenderApproval](type-aliases/RenderApproval.md) | Replaces the default preview (title and lines) of an approval panel; the choices stay. |
| [ResultFormatter](type-aliases/ResultFormatter.md) | The line shown under a tool call for its result: a string replaces the kit's (plain text, drawn in the result's color, or the error color if it failed), `null` hides it, and `undefined` keeps the kit's (the result's first line). |
| [SessionOpener](type-aliases/SessionOpener.md) | Builds the session's options for a run folder, e.g. `(run) => buildSessionOptions(config, run.dir, spec, { run })`: called for the first run and again for each one resumed with /resume (MCP servers, the step gate and the transcript are bound to the run's folder, so they're built anew). |
| [ThemeColor](type-aliases/ThemeColor.md) | A color for one role of the theme: a color name (`"gray"`, `"cyanBright"`: picocolors' and Ink's names), a hex (`"#ff8800"`), or a function that styles the text itself (bold, a background...). Roles drawn by Ink props (`border`, `selection`, the panels' `accent`) need a name or a hex: a function there falls back to the default color. |
| [ToolDescriber](type-aliases/ToolDescriber.md) | An agent's labels for its own tools: the tool's short name and input, to a label, or `undefined` for the kit's default. |
| [ToolDetail](type-aliases/ToolDetail.md) | How much of its tool calls a chat shows: `"full"`, every call with its result line; `"calls"`, the calls without their results (a failed call says so in one short line); `"summary"`, one line per group. Ctrl+O unfolds any of them into the full view. |
| [ToolLabels](type-aliases/ToolLabels.md) | Tools' labels by full name (`mcp__<server>__<tool>`): what the extensions of a session bring. |
| [ToolPhrase](type-aliases/ToolPhrase.md) | How a tool counts in a folded group's summary: the phrase for one call and for several, "{n}" standing for the count. |
| [TranscriptEntry](type-aliases/TranscriptEntry.md) | One block of the conversation, as a view shows it. |
| [WizardAnswers](type-aliases/WizardAnswers.md) | The wizard's answers, by step name. |
| [WizardStep](type-aliases/WizardStep.md) | One question of `runWizard()`. |

## Variables

| Variable | Description |
| ------ | ------ |
| [allowAnyMcpTool](variables/allowAnyMcpTool.md) | Approves any MCP tool call ("mcp__<server>__<tool>"), regardless of which server it comes from, and denies everything else. This is what lets a project's own .mcp.json declare arbitrary additional MCP servers without the host agent's code needing to know their names ahead of time: a fixed allowedTools wildcard like "mcp__playwright__*" only matches that one named server — confirmed empirically that a bare "mcp__*" entry does NOT match "mcp__<server>__<tool>" the way a real per-server wildcard does — so a dynamic decision here is the only way to cover every MCP server generically. |
| [BUILT\_IN\_PAGE\_TYPES](variables/BUILT_IN_PAGE_TYPES.md) | The kit's page types (ADR-008), and the person's preferences (#33). |
| [DEFAULT\_HUMAN\_APPROVAL\_TEXTS](variables/DEFAULT_HUMAN_APPROVAL_TEXTS.md) | Domain-neutral defaults — a concrete agent should normally override these via `AgentSpec.humanApprovalTexts` with wording specific to what "publishing" means in its domain. |
| [DEFAULT\_THEME](variables/DEFAULT_THEME.md) | The kit's own look. |
| [SUPPORTED\_LANGUAGES](variables/SUPPORTED_LANGUAGES.md) | The language codes the kit's texts come in. |
| [terminalInteractionPort](variables/terminalInteractionPort.md) | The default `InteractionPort`, installed by the package entry point: prints the checkpoint and reads the answer on the terminal, on the chat's own readline when one is registered via `setSharedReadline()`. Without a TTY it prints nothing and never answers. |

## Functions

| Function | Description |
| ------ | ------ |
| [addExtension](functions/addExtension.md) | Installs an extension into a scope from a folder or a git repository (`url#ref`, `sha` to pin a commit, and `subdir` for one inside it): copies its files (never runs a script), checks its manifest, and locks it, enabled, with the marketplace it came from when it did (`origin`, for a temporary folder, is what the lock says it came from). An extension with the same name in that scope is replaced; its data folder stays. With `link`, a folder is registered where it is instead, to develop it: not copied, and its files not checked. |
| [addMarketplace](functions/addMarketplace.md) | Adds a marketplace to the agent (its extensions folder, `dir`) from a folder, a git URL (`#ref`) or `owner/repo`, taking a copy; one with the same name is replaced. Asking the person first is the caller's: the kit's command asks them to type its name, unless it's `official`. |
| [agentKitVersion](functions/agentKitVersion.md) | The version of agent-kit in use, read from its own `package.json` (next to `dist/`, or `src/` under tsx), e.g. to show it in an agent's header or log. |
| [askForChoice](functions/askForChoice.md) | A choice between `options`, through the port's `askChoice()` (or `askDecision()` with the options numbered in the prompt) and the response file, which takes the same answer: the numbers, or the person's own words. |
| [askForDecision](functions/askForDecision.md) | Asks the human for a decision through two channels in parallel, whichever answers first wins: (1) the installed `InteractionPort` (the keyboard, for a person running the process in their own terminal, see tui/terminalInteraction.ts), and (2) a response file, for when something else (e.g. Claude Code, or a non-terminal host driving its own UI — an Electron main process, a Tauri sidecar) is piloting the run and has no interactive stdin to write to. |
| [askForManualIntervention](functions/askForManualIntervention.md) | Like `askForDecision()`, for a manual-intervention checkpoint (see tools/manualLogin.ts). |
| [askForText](functions/askForText.md) | A free-text answer, through the port's `askText()` (or `askDecision()` when it has none) and the response file: trimmed, with its case kept. |
| [awareness](functions/awareness.md) | The awareness (#43): the agent knows who it is and what it is at each moment of a session, and the person can ask it. A "Who you are" section, `about_me` (the session's facts, read anew on every call through `ExtensionContext.session()`, and the agent's `guide`), and the `help` skill, how the kit's chat is used, which doesn't change. It needs the spec's `identity`. |
| [buildSessionOptions](functions/buildSessionOptions.md) | Builds the `options` object passed to the Agent SDK's `query()` — everything about *how* the agent runs a session (system prompt, tools, MCP servers, hooks), independent of *what* is said to start it off (that's the caller's `prompt`, a plain string for a one-shot run or an `AsyncIterable` for a multi-turn chat). |
| [checkFileScope](functions/checkFileScope.md) | The reason to deny `toolName` with `input` under `scope`, or `undefined` to let it through. Tools other than Read/Write/Edit/Grep/Glob are never judged here, and a call without a path is left for the tool itself to reject. |
| [checkPlanScope](functions/checkPlanScope.md) | The reason to deny `toolName` with `input` in plan mode, or `undefined` to let it through. Anything not known to only read is denied, so a tool nobody thought of can't change anything while the human reviews the plan. |
| [createChatController](functions/createChatController.md) | Opens the chat's session (the first run with a session opener, `--continue` picking the latest) and loads the history; `start()` then draws the run's conversation and sends the initial prompt, `send()` each line the person types. |
| [createConsoleRenderer](functions/createConsoleRenderer.md) | The console rendering of `runQuery()`'s event stream, shared by `runChatTui()` and by any one-shot run that prints the same events. Streamed text rarely ends in a newline, so every other line (actions, notices, errors) starts by ending the current line only if it isn't already ended — never with a fixed "\n", which leaves a blank line between consecutive actions. |
| [createDeferred](functions/createDeferred.md) | Externally-controllable promise — used to know when a chat turn has finished. |
| [createFileKnowledgeStore](functions/createFileKnowledgeStore.md) | A `KnowledgeStore` over the markdown files of `knowledgeDir`. |
| [createFileScopeGate](functions/createFileScopeGate.md) | PreToolUse hook enforcing `scope` on Read/Write/Edit/Grep/Glob, for the main agent and its subagents alike. Bash, when a subagent has it, is not covered: it can reach any path, which is why Bash-granting features stay opt-in. |
| [createFriendlyToolLabel](functions/createFriendlyToolLabel.md) | Builds a `friendlyToolLabel(toolName, toolInput)` — `describe` lets the host agent layer its own domain-specific cases (e.g. Playwright's browser_* tools) on top of this kit's generic ones; `extraLocalServers` names any *additional* MCP server (beyond this kit's own "approvals"/"manualLogin"/"time") whose tools should be unwrapped without a "[server] " prefix, e.g. "playwright". |
| [createHumanApprovalServer](functions/createHumanApprovalServer.md) | The tools that ask the person, in every mode but autonomous: `request_human_approval` (right before an action that publishes something visible to others and that's hard to undo), `ask_human` (a choice between options, in a panel, within the turn) and, when the session can be in plan mode (`modeControl`), `present_plan`, the kit's own way out of plan mode (ADR-023): the person runs the plan, keeps planning or cancels. |
| [createInputQueue](functions/createInputQueue.md) | User message queue backed by a single long-lived generator, for any multi-turn (chat-shaped) caller of `query()`. |
| [createKnowledgeServer](functions/createKnowledgeServer.md) | The `knowledge` MCP server over `store`. |
| [createManualLoginServer](functions/createManualLoginServer.md) | Checkpoint tool for when the agent hits something it can't do itself (typically a login it has no credentials for, or one that fails unexpectedly). Pauses execution until a human confirms they've intervened by hand in whatever live interface the agent is driving (a browser window, say), and then lets the agent continue. There is deliberately no default wording: what counts as a manual intervention is entirely the domain's, so the concrete agent always supplies `texts` (see `AgentSpec.manualInterventionTexts`). |
| [createModeControl](functions/createModeControl.md) | A `ModeControl` starting at `initial` (`buildSessionOptions()` returns one for its session). |
| [createPlanGate](functions/createPlanGate.md) | PreToolUse hook for "plan" mode: the agent only reads and plans (see checkPlanScope()). Registered for every session that can be in plan mode and deciding only while `isActive()` says it is; otherwise it gives no decision, so the call goes on as if it weren't there. It's the kit's own gate, not the SDK's `permissionMode: "plan"` (ADR-023). |
| [createProgressView](functions/createProgressView.md) | The Ink counterpart of `createConsoleRenderer()` for one-shot ("run"-style) sessions: the same methods and the same text (so `onWrite` logs exactly what the console version would), plus a spinner with the current action, approval panels and a status bar. Checkpoints go through an Ink `InteractionPort` until `close()`. |
| [createPromptLoader](functions/createPromptLoader.md) | Builds a `loadPrompt(relativePath, vars)` bound to `rootDir` — so each agent built on this kit supplies its own prompts directory (its own domain content) and gets the same `{{key}}` substitution/fail-loudly behavior for free. |
| [createRunFolder](functions/createRunFolder.md) | Creates a new, empty run folder under `runsDir`. |
| [createRunStore](functions/createRunStore.md) | A `SessionStore` (the SDK's adapter for keeping transcripts elsewhere) that keeps one session in one run folder: `conversation.jsonl` for the main transcript, `subagents/*.jsonl` for each subagent's, and `session.json` with the session's id and which file is which subagent's. The SDK appends to it as the transcript grows and loads from it before resuming (confirmed empirically: a resumed session remembers the conversation, its subagents' transcripts included, even with the CLI's own copy deleted). The CLI still writes that copy under `~/.claude/projects/`: it can't be turned off while a store is in use. |
| [createSaveToSourcesServer](functions/createSaveToSourcesServer.md) | The tools that keep `sourcesDir`, the originals the agent reads but never edits (Write/Edit are scoped to the notes folder, see hooks/fileScopeGate.ts): `save_to_sources`, `list_sources` and `download_to_sources`, plus `request_file` and `retire_source` when a person can be asked. Nothing is ever overwritten or deleted; the bookkeeping is in sources.ts (this extension's). |
| [createStepGate](functions/createStepGate.md) | PreToolUse hook for "interactive" mode: pauses before every action and asks for confirmation (by keyboard or by file, see humanInput.ts), like reviewing a plan step by step. |
| [createSubagentBashGate](functions/createSubagentBashGate.md) | PreToolUse hook restricting the Bash tool to subagents only, never the main agent directly. See session.ts's buildSessionOptions(), which attaches this hook whenever `AgentSpec.buildSubagents()` returned something for this config. |
| [createSubagentForegroundGate](functions/createSubagentForegroundGate.md) | PreToolUse hook forcing `run_in_background: false` on every Agent-tool call that spawns one of this session's own subagents. The Agent tool's own input schema defaults to background execution ("Agents run in the background by default", its own description says) unless the model explicitly opts out per call — confirmed empirically (in a real consuming agent) that with a less directive prompt, the model left it on that default, the main turn's "result" fired before the subagent had done anything at all, and the whole invocation was silently lost: no file written, no error, nothing — because the caller's message loop had no code watching for background-task completion (SDKTaskStartedMessage/SDKTaskUpdatedMessage/etc. are never handled). Setting `background: false` on the AgentDefinition itself (session.ts's `agents: {...}`) does NOT fix this — confirmed empirically it has no effect on which way the model's own per-call `run_in_background` input resolves. Rewriting the tool input here, before it ever executes, is the only lever that actually forces synchronous execution regardless of what the model asked for. |
| [createSubagentTypeGate](functions/createSubagentTypeGate.md) | PreToolUse hook restricting the Agent tool to the subagent types this session actually registered (session.ts's `agents: {...}`, from `AgentSpec.buildSubagents()`) — confirmed empirically that the Agent SDK also exposes a built-in "general-purpose" subagent_type regardless of what `agents` lists, and that spawning one that way inherits the *whole* session's own tools (including Bash, whenever any opt-in subagent turned it on) rather than the narrow `AgentDefinition.tools` each declared subagent actually declares. Without this hook, that built-in type is a way to route around subagentBashGate.ts entirely: once inside it, `agent_id` is set exactly like an intended subagent, so the Bash-from-main-thread check alone can't tell them apart — this is exactly what happened in practice in a real consuming agent (the model delegated a plain file deletion to a spontaneous "general-purpose" agent to get at Bash, instead of using its own tools and leaving the stray file alone). |
| [createTranscriptLogger](functions/createTranscriptLogger.md) | Logs every tool call (request + result) as one JSON line, redacting `secrets` (e.g. a domain-specific password — see `BaseSessionConfig.secrets`) plus `CLAUDE_CODE_OAUTH_TOKEN`, which this kit always scrubs regardless of domain since it owns the auth-token concept (see claudeAuth.ts). |
| [detectLanguage](functions/detectLanguage.md) | `resolveLanguage()` with the running process's arguments, locale and environment. |
| [ensureClaudeAuth](functions/ensureClaudeAuth.md) | The terminal-facing counterpart to `resolveClaudeAuth()` (core/claudeAuth.ts), which only *looks up* a token. This one also gets you one: if `resolveClaudeAuth(config)` comes back empty, it prints why, offers to run "claude setup-token" interactively, and sets the result on `process.env.CLAUDE_CODE_OAUTH_TOKEN` for this run. Exits the process if the user declines or cancels — there's no agent to run without a token. |
| [extensionDataDir](functions/extensionDataDir.md) | An installed extension's data folder: `${CLAUDE_PLUGIN_DATA}` in its servers' arguments and variables (a browser profile, a cache), in its scope, outside its plugin and its hash, so it's kept across sessions and updates. Created when a session starts it; removing the extension asks before deleting it. |
| [findPlugin](functions/findPlugin.md) | A plugin found in the known marketplaces: `<name>@<marketplace>`, or a name only one of them offers. |
| [getInteractionPort](functions/getInteractionPort.md) | The port checkpoints ask through right now, or `null`. |
| [getLanguage](functions/getLanguage.md) | The language of the kit's texts right now. |
| [getSharedReadline](functions/getSharedReadline.md) | The registered `readline` interface, or `null`. |
| [getTheme](functions/getTheme.md) | The theme in use right now. |
| [inspectMarketplace](functions/inspectMarketplace.md) | Reads a marketplace from a folder, a git URL (`#ref`) or `owner/repo` without adding it: what to show before asking. |
| [installFromMarketplace](functions/installFromMarketplace.md) | Installs `<plugin>@<marketplace>` (or a plugin only one known marketplace offers) into a scope, locked with where it came from. Its name in the agent is its `plugin.json`'s, as for any extension. |
| [isExitPromptError](functions/isExitPromptError.md) | True for the error @inquirer/prompts throws when the user cancels (Ctrl+C) a prompt. |
| [isSlug](functions/isSlug.md) | Whether `slug` is lowercase ASCII words joined by hyphens. |
| [knowledge](functions/knowledge.md) | The built-in knowledge base (ADR-008, ADR-024): an interlinked wiki the agent keeps only through its `knowledge_*` tools, over a `KnowledgeStore` (the kit's over markdown files, or the agent's own). The host reads it through `apis.knowledge.knowledgeStore`. |
| [knowledgePluginRoot](functions/knowledgePluginRoot.md) | Absolute path of the knowledge base's plugin shipped with the kit, next to `dist/` (or `src/` under tsx). |
| [knowledgePromptSection](functions/knowledgePromptSection.md) | The "Knowledge base" section appended to the system prompt: the layers and the working rules, listing `pageTypes`, for a knowledge base reached through the `knowledge_*` tools (ADR-024). With a sources folder, also how summaries and originals are matched (by the model, with the two extensions' tools: each owns its data, #30); the folder itself is the sources' section. `preferences` (the active `preference` pages) are listed by title, up to `PREFERENCES_IN_PROMPT`. |
| [linkedIds](functions/linkedIds.md) | The ids every `[text](id)` link in `markdown` points to (links that look like page ids). |
| [listInstalled](functions/listInstalled.md) | Every extension installed in the scopes, the project's first. |
| [listMarketplaces](functions/listMarketplaces.md) | The marketplaces the agent knows, with their manifests when they can be read. |
| [listRuns](functions/listRuns.md) | The runs under `runsDir` that kept a conversation, newest first; runs without `session.json` are left out. |
| [memory](functions/memory.md) | The memory of the person (#34): what the agent learns about the person it works for, kept across all their projects in a folder of its own, reached only through its tools (`recall`, `remember`, `forget`). What it remembers must quote the person's own messages, which it hears through a `UserPromptSubmit` hook (and, for a resumed run, from the run's conversation). |
| [messagesFor](functions/messagesFor.md) | A language's texts; any it lacks come from English (nested groups key by key). |
| [parseId](functions/parseId.md) | `type/slug` split, or null when it isn't one. |
| [readConversation](functions/readConversation.md) | The human's messages and the agent's replies in a run's conversation, in order. |
| [readExtensionManifest](functions/readExtensionManifest.md) | Reads an extension's manifest from its plugin. |
| [readExternalManifest](functions/readExternalManifest.md) | Reads an extension's manifest, checking what the kit needs from it. |
| [readMarketplaceManifest](functions/readMarketplaceManifest.md) | Reads and checks a marketplace's `.claude-plugin/marketplace.json`. |
| [removeExtension](functions/removeExtension.md) | Removes an extension from a scope (its files and its lock entry; a linked one's folder is left where it is), and its data folder with `deleteData`; false when it wasn't there. |
| [removeMarketplace](functions/removeMarketplace.md) | Forgets a marketplace (its copy and its entry); the extensions installed from it stay. False when it wasn't known. |
| [resolveClaudeAuth](functions/resolveClaudeAuth.md) | Pure lookup, no I/O and no console output of any kind — safe to call from a headless/non-interactive consumer (a server, an Electron main process) as much as from a terminal one. |
| [resolveLanguage](functions/resolveLanguage.md) | The language for the kit's texts and the agent's replies: `--language=<code>`, then the agent's option, then the system's language, then English. A code that is asked for but isn't supported falls through to the next source, with a warning. Pure: `detectLanguage()` fills the sources from the running process. |
| [resolvePluginSource](functions/resolvePluginSource.md) | Where a plugin's source points: a folder of the marketplace's copy, a git repository, an npm package or a zip. |
| [runChatInk](functions/runChatInk.md) | The Ink counterpart of `runChatTui()`, with the same options, session log and history file: history in the scrollback, the reply streaming in place, a spinner with the current action (and a subagent's), approval panels, "/command" completion and a status bar. Checkpoints go through an Ink `InteractionPort` while the chat runs, so no second stdin reader ever competes with Ink's; the response file keeps working as always. |
| [runChatTui](functions/runChatTui.md) | A ready-to-run interactive terminal chat loop, assembled from this kit's own chat primitives: `createInputQueue()` feeds typed lines into a multi-turn `query()` session, `runQuery()`'s normalized event stream is rendered to the console (streamed text, friendly action labels via `createFriendlyToolLabel()`, turn failures), and this loop's own `readline.Interface` is registered via `setSharedReadline()` so any human-in-the-loop checkpoint the session hits (the interactive-mode step gate, or the guided-mode approval/ manual-login tools — see terminalInteraction.ts) prompts on the same interface instead of a second one fighting it for stdin's raw mode. |
| [runExtensionCommand](functions/runExtensionCommand.md) | The `extension` command an agent exposes in its own binary (#37), e.g. `captain extension add ./jokebook --project`: installs, removes, enables, disables and lists the extensions in its two scopes. Returns `false` when `argv` isn't this command (so the agent goes on), and sets `process.exitCode` to 1 on an error. |
| [runQuery](functions/runQuery.md) | Thin wrapper around the SDK's own `query()`: same two-argument shape (a plain string for a one-shot run, or an `AsyncIterable<SDKUserMessage>` — see `createInputQueue()` — for a multi-turn chat), translating its raw message stream into `AgentEvent`s as described above. Every other control surface of the underlying `Query` (`interrupt`, `close`, `supportedCommands`) is passed through unchanged. |
| [runWizard](functions/runWizard.md) | Asks `steps` in order and resolves with every answer by step name. A step's message, choices or default can depend on earlier answers, and `when` skips it, so a consumer's whole interactive menu becomes a list of step definitions. |
| [setExtensionEnabled](functions/setExtensionEnabled.md) | Enables or disables an installed extension in a scope; false when it isn't there. |
| [setInteractionPort](functions/setInteractionPort.md) | Installs the port every checkpoint asks through (`null`: answer through the response file only). One per process. |
| [setLanguage](functions/setLanguage.md) | Sets the language of the kit's texts directly (a host that resolved it itself, tests). |
| [setSharedReadline](functions/setSharedReadline.md) | Registers the chat's `readline` interface, so checkpoints ask on it instead of opening a second one (`null` to unregister). |
| [setTheme](functions/setTheme.md) | The kit's default theme with `overrides` on top: only the roles given change. |
| [sources](functions/sources.md) | The sources folder: originals kept as obtained, read with `Read` and `extract_text`, added and retired only through its tools (`sourceFiles`). It knows nothing of a knowledge base (#30). |
| [sourcesPromptSection](functions/sourcesPromptSection.md) | The "Sources" section appended to the system prompt whenever there's a sources folder, with or without a knowledge base: what the originals are and how they come and go. `projectDir` and `sourcesDir` give the folder's name as the model reads it. |
| [summarizeToolResponse](functions/summarizeToolResponse.md) | Avoids bloating the transcript with large payloads (browser-tool screenshots/base64). |
| [switchLanguage](functions/switchLanguage.md) | Switches the kit's language on purpose, e.g. the person picked another in a chat (#47): from then on it wins over `--language` and `config.language`, until switched again. The session says so to the model when it opens next (the controller's `setLanguage()` reopens it). |
| [togglePlanMode](functions/togglePlanMode.md) | What the chats' `/plan` does: switches `control` into plan mode, or, when it's already there, back to the mode it was entered from ("guided" if it started in plan mode). Returns the new mode, or `null` when this session can't be in plan mode (an autonomous one). |
| [truncate](functions/truncate.md) | Cuts `text` to `max` characters, with "…" at the end. |
| [truncatePath](functions/truncatePath.md) | Cuts a path to `max` characters from the front, with "…": unlike `truncate()` (which cuts the tail off long freeform text), a path's most useful part, the file name, is at the end. |
| [updateMarketplace](functions/updateMarketplace.md) | Takes a fresh copy of a known marketplace from where it came from. |
| [withToolLabels](functions/withToolLabels.md) | A `formatAction` that shows the tools in `labels()` with their label, and any other with `formatAction` (the kit's by default). `labels` is read on every call, so it can follow the session in use (`/resume` opens another). |
| [withToolPhrases](functions/withToolPhrases.md) | A `toolPhrase` that counts the tools in `labels()` with their phrase, and any other with `toolPhrase`. |
