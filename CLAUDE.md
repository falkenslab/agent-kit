# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@falkenslab/agent-kit` is generic, domain-agnostic scaffolding for building an agent on top of the `@anthropic-ai/claude-agent-sdk`: session/options wiring, human-in-the-loop hooks and tools, transcript logging, tool-label formatting, a reusable terminal chat TUI, global config, and Claude auth.

It was extracted from `moodle-agent` (a concrete agent built on this kit) so the generic parts could be versioned and reused independently. It has its own repo and its own versioning (currently 0.x — API not yet stable), is **not yet published to npm**, and is consumed by sibling agent repos via a `file:` dependency pointing here (see `install-links` note in git history for how that consumption works across a Windows/WSL boundary).

There is no *production* concrete agent in this repo — most design decisions here are validated empirically against how `moodle-agent` actually used them — several source comments say "confirmed empirically" and reference specific incidents from that consuming repo. Trust those comments; they encode real SDK behavior that isn't always documented, or fixes for concrete bugs seen in production use. `examples/captain-whiskers/` is a toy exception: a minimal joke-telling agent that exercises the kit end-to-end (`AgentSpec`, `buildSessionOptions()`, `runChatTui()`, `ensureClaudeAuth()`, a plugin-provided skill and slash command via `pluginRoots()`) for demonstration only, not a source of its own "confirmed empirically" findings. It always runs in `mode: "autonomous"` (hardcoded, no CLI argument to change it), so it no longer demonstrates the approval checkpoint (`request_human_approval`, `guided`/`interactive` modes) — see `tools/humanApproval.ts` and `hooks/stepGate.ts` for that behavior instead.

## Commands

```
npm run build       # tsc — compiles src/ to dist/ (also emits .d.ts)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # tsx --test "test/**/*.test.ts" — runs everything under test/
```

Run a single test file directly instead of through the npm script filter:
```
npx tsx --test test/tui/promptErrors.test.ts
```

There is no separate "watch" script. Tests use Node's built-in test runner (`node:test` + `node:assert/strict`), executed directly against TypeScript source via `tsx` (no compile step needed for tests).

## Architecture

### Module resolution and imports

The project targets `NodeNext` module resolution (`tsconfig.json`) and is `"type": "module"`. All relative imports inside `src/` use explicit `.js` extensions (e.g. `import { createTranscriptLogger } from "./hooks/transcriptLogger.js"`) even though the source files are `.ts` — this is required by NodeNext resolution and matches how the compiled output will actually resolve at runtime. Follow this convention for any new file.

`src/` splits into two folders along exactly one line: does this file assume a terminal is present? `src/core/` (session/options wiring, hooks, tools, auth resolution, transcript logging, tool-label formatting — everything below except "Terminal chat TUI") never touches `console.*`/`process.stdout`/`readline`, so it's usable as-is from any Node host, not just a CLI — a desktop app's main process (Electron; confirmed empirically, see `moodle-agent`'s own `desktop/`, which drives sessions and human-in-the-loop approvals this way, entirely via `<runDir>/approval-response.txt`, no terminal involved), a server, or a sidecar process talking to a non-Node host (e.g. a Tauri 2 app, whose Rust/webview side can't run this package directly — it has no bundled Node runtime). `src/tui/` is the one place that does assume a terminal (`readline`, `picocolors`, `@inquirer/prompts`) — `runChatTui()`'s ready-made chat loop and `ensureClaudeAuth()`'s interactive token setup. `src/index.ts` (which stays at the top level, re-exporting from both) is the only file allowed to import from both sides; nothing under `core/` may import from `tui/`.

### The core abstraction: `AgentSpec` + `buildSessionOptions`

The kit's central contract is `AgentSpec<TConfig>` (`src/core/agentSpec.ts`). A concrete agent implements this interface to supply everything that's genuinely domain-specific — system prompt, MCP servers, plugin roots, opt-in subagents, disallowed tools, human-approval/manual-intervention wording — while `buildSessionOptions()` (`src/core/session.ts`) supplies everything that's generic and falls out of `BaseSessionConfig.mode` alone.

`BaseSessionConfig` defines three `Mode` values that drive session behavior everywhere in this kit:
- **`interactive`** — pauses before every single tool call (step gate hook).
- **`guided`** — only pauses before hard-to-undo/visible-to-others actions (human approval tool available, no step gate).
- **`autonomous`** — no human-in-the-loop channel at all (approval tool and manual-login tool both omitted).

Deliberately independent of whether the session is a one-shot run or a multi-turn chat — that's decided by which entry point the caller uses (`runChatTui()`/`createInputQueue()` vs. a plain `query()` call), not a mode. A concrete agent that needs to know "this is a chat session" for its own purposes (e.g. picking a different system-prompt template) tracks that as its own domain field on its config type, not mixed into `mode` (an earlier version had a fourth `"chat"` value that behaved exactly like `"guided"` with no real branch of its own — removed for exactly this reason).

A concrete agent's config type extends `BaseSessionConfig` with domain fields (course URL, credentials, ...) that `buildSessionOptions()` itself never inspects — only `AgentSpec`'s own methods receive the full concrete config. This separation is deliberate: it's what lets this kit stay domain-agnostic while still being the thing that decides tool/hook wiring per mode.

Read the doc comments in `src/core/agentSpec.ts` and `src/core/session.ts` before changing either — they explain *why* each piece is wired the way it is, including several confirmed-empirically SDK quirks (e.g. `disallowedTools` takes full precedence over `canUseTool`; a bare `tools`/`allowedTools` entry is auto-approved before `canUseTool` is ever consulted).

### Subagent security model (three cooperating hooks)

Opt-in subagents (`AgentSpec.buildSubagents()`) need both `Agent` and `Bash` present in the session's own tool list — the SDK refuses to spawn a subagent whose declared tools aren't already in the session's tools. But once `Bash` is present, it's also directly available to the *main* agent and bypasses `canUseTool` for built-in tools entirely. Three `PreToolUse` hooks in `src/core/hooks/` close this off together, and **all three matter — removing any one reopens a bypass**:

- `subagentBashGate.ts` — denies `Bash` whenever the hook input has no `agent_id` (i.e. called from the main thread, not from inside a subagent).
- `subagentTypeGate.ts` — restricts the `Agent` tool's `subagent_type` to whatever `buildSubagents()` actually registered. Without this, the SDK's own built-in `"general-purpose"` subagent type is spawnable regardless of what's registered, inherits the *whole* session's tools (Bash included), and was used in practice (on `moodle-agent`) to route around the Bash gate — the model delegated a plain file deletion to a spontaneous general-purpose agent just to get at Bash.
- `subagentForegroundGate.ts` — forces `run_in_background: false` on every `Agent` call for a registered subagent type. The Agent tool defaults to background execution unless the model opts out per-call, and (confirmed empirically) `AgentDefinition.background: false` does *not* affect this — only rewriting the tool input in a hook does. Without this, a subagent invocation can silently vanish (main turn completes before the subagent produces anything, no error, nothing written) because nothing in this kit's caller loop watches for background-task completion messages.

If you touch subagent wiring, re-read all three files together, not just one.

### Human-in-the-loop channel

`src/core/hooks/humanInput.ts`'s `askForDecision()` races two channels for an answer: interactive keyboard input (when stdin is a TTY — when it isn't, no console output happens and no `readline.Interface` is even created, so a non-terminal host stays silent) and a response file under `runDir` (for when a separate process, e.g. Claude Code itself, or a non-terminal host driving its own UI, is piloting the session with no interactive stdin). Both the `interactive`-mode step gate (`stepGate.ts`) and the `guided`-mode approval tool (`tools/humanApproval.ts`) go through this same function. `sharedReadline.ts` exists so a chat REPL's own `readline.Interface` can be reused here instead of a second one fighting over stdin's raw mode — `runChatTui()` (see below) is this kit's own caller of `setSharedReadline()`.

The manual-intervention tool (`tools/manualLogin.ts`, `request_manual_login`) is gated differently from the approval tool: `buildSessionOptions()` only registers it when `spec.manualInterventionTexts` is set (`mode !== "autonomous"` still applies too). There's no generic fallback wording the way `humanApprovalTexts` has one, because "a human can step into a live UI by hand" (a browser window, say) isn't a concept every agent built on this kit has — an agent with no such UI (a pure chat/text agent) should simply never set `manualInterventionTexts`, and the tool won't exist for it. (An earlier version gated this off a `headless: boolean` on `BaseSessionConfig` instead — that baked a browser-automation assumption into the otherwise domain-agnostic base config and forced every consumer to answer a question that often had no real referent; the opt-in-via-texts design replaced it.)

### Terminal chat TUI

`runChatTui()` (`src/tui/chatTui.ts`) is a ready-to-run interactive terminal chat loop, assembled entirely from primitives that already existed elsewhere in the kit: `createInputQueue()` (`core/session.ts`) feeds typed lines into a multi-turn `query()`, `runQuery()`'s normalized event stream is rendered to the console (streamed text, friendly action labels via `createFriendlyToolLabel()`, turn failures), and its own `readline.Interface` is registered via `setSharedReadline()` so any human-in-the-loop checkpoint the session hits prompts on the same interface rather than a second one corrupting stdin's raw mode. It takes the SDK `Options` produced by `buildSessionOptions()` (not an `AgentSpec` directly), so it composes with any agent already built on this kit: `const { options } = await buildSessionOptions(config, runDir, spec); await runChatTui(options)`. A non-terminal host (Electron, a Tauri sidecar) drives the same core session directly instead — `runChatTui()`/`src/tui/` entirely is that host's own job to replace with its own UI.

Its event-draining loop (`drainTurn()`, exported from `chatTui.ts` for testing but not re-exported from `index.ts`) deliberately consumes `run.events` via manual `.next()` calls, never `for await...of` + `break` — `run.events` is one long-lived generator spanning the *whole* multi-turn session, and breaking a `for-await-of` loop calls the generator's `.return()`, permanently closing it. Getting this wrong silently drops every turn after the first. `test/tui/chatTui.test.ts` regression-tests exactly this.

`src/tui/ui.ts` (the picocolors console palette, exported as the `ui` namespace) lives alongside it — it's terminal presentation, used by `runChatTui()` and by `tui/claudeAuth.ts`'s console output.

### MCP tool permissions

`canUseTool` is always set to `allowAnyMcpTool` (`src/core/mcpPermissions.ts`), which approves any `mcp__<server>__<tool>` call regardless of server name and denies everything else. This is deliberate: a fixed `allowedTools` wildcard entry only matches one named server (`mcp__*` does *not* match `mcp__<server>__<tool>`, confirmed empirically), so a dynamic per-call decision is the only way to let a project's own `.mcp.json` register arbitrary additional MCP servers without this kit's code needing to know their names ahead of time. `disallowedTools` still takes full precedence over this.

### Transcript logging and secret redaction

`createTranscriptLogger()` (`src/core/hooks/transcriptLogger.ts`) writes one JSON line per tool call (pre + post) to `transcript.jsonl` in the run directory, redacting `config.secrets` plus `CLAUDE_CODE_OAUTH_TOKEN` unconditionally (this kit owns the auth-token concept — see `core/claudeAuth.ts`). Tool responses are summarized (`summarizeToolResponse`) before logging: long strings truncated at 2000 chars, base64 payloads (e.g. browser-tool screenshots) replaced with a byte-count placeholder.

### Auth

Auth resolution is split across two layers, the same `core/`/`tui/` split as the whole package (see "Module resolution and imports" above). `resolveClaudeAuth(config?)` (`src/core/claudeAuth.ts`) is the pure core: checks `ANTHROPIC_API_KEY` env var (API billing, no token needed) → `CLAUDE_CODE_OAUTH_TOKEN` env var → `config.claudeCodeOAuthToken` if the caller passed one, and returns `true`/`false` — no I/O, no console output, no process exit, safe to call from a non-interactive consumer (a server, an Electron main process). This kit owns no persistence of its own (an earlier version read/wrote `~/.<appName>/config.json` itself via a now-removed `globalConfigStore.ts` — see git history): sourcing a token across runs, if a concrete agent wants that at all, is entirely its own business. `ensureClaudeAuth(config?)` (`src/tui/claudeAuth.ts`) wraps it for a real terminal: if the core resolver comes back empty, it prints why, offers to run `claude setup-token` interactively (`@inquirer/prompts`), sets the result on `process.env.CLAUDE_CODE_OAUTH_TOKEN` for this run, and returns the freshly-generated token so the caller can persist it however it likes (returns `undefined` when nothing new was generated) — or exits the process if the user declines/cancels, since there's no agent to run without a token.

This mirrors `includeManualLoginTool`'s own split further up: a capability that only makes sense with a human physically present (confirm prompts, colored output, `process.exit`) lives under `tui/`, while the pure lookup logic stays in the core so a non-terminal consumer isn't forced to depend on `@inquirer/prompts` or `tui/ui.ts` just to check whether a token exists.

### `runner.ts`: normalizing the SDK's raw message stream

`runQuery()` wraps the SDK's `query()` and translates its raw message stream into a small `AgentEvent` union (`text`, `action`, `mcp-error`, `info`, `turn-end`) — deliberately thin, with no presentation formatting (that's left to the caller). The one piece of interpretation it always applies: tool calls from *inside* a subagent's own turn (`parent_tool_use_id !== null`) are filtered out of the `action` stream, since they're already reported back through the `Agent` tool call that spawned them. When checking whether a turn actually failed, use the `failed` field, not `status === "success"` — the SDK can report `status: "success"` even on a genuine API-level failure (confirmed empirically for an org-level access-denied error), with the real error text landing in `resultText` instead of `errorText` in that one case.

### Public API surface

`src/index.ts` is the single source of truth for what this package exports. It re-exports a handful of SDK types (`Options`, `McpServerConfig`, `AgentDefinition`) so a consuming agent that only calls `buildSessionOptions()`/`runQuery()` (not the SDK's `query()`/`tool()`/`createSdkMcpServer()` directly) doesn't need `@anthropic-ai/claude-agent-sdk` in its own `package.json` at all — the SDK is a peerDependency of this kit for that reason. When adding a new exportable symbol, add it here rather than expecting consumers to deep-import from `src/`.
