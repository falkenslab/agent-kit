---
sidebar_position: 1
title: SDK behaviors
description: Behaviors of the Claude Agent SDK and CLI, confirmed by hand, that the kit relies on or works around.
---

# SDK behaviors

The kit encodes several behaviors of the Claude Agent SDK (and the Claude Code CLI it runs) that its documentation doesn't state, or states differently. Each was checked against the real SDK; the source comments mark them as "confirmed empirically". They're re-checked on every SDK upgrade of the kit. If you build sessions by hand, you need to know them too.

## Tools and permissions

- **`disallowedTools` wins over everything.** A disallowed tool never reaches `canUseTool`, let alone runs.
- **Built-in tools in `tools`/`allowedTools` are approved before `canUseTool`** is consulted, and bypass it. The SDK warns about it (`CLAUDE_SDK_CAN_USE_TOOL_SHADOWED`); the kit silences that one warning.
- **`mcp__*` is not a valid wildcard** in `allowedTools` for `mcp__<server>__<tool>`: only per-server wildcards match. Hence `allowAnyMcpTool` as `canUseTool`.
- **With an explicit `tools` list, the `Skill` tool must be listed** to be offered, even though the skills are loaded. Without it, the model looks for `SKILL.md` files by hand.
- **A `z.record()` in an in-process tool's schema makes the SDK drop every tool of that server**, silently: the server shows as connected, but its tools aren't offered. The kit's tools use lists of `{ name, value }` pairs instead.
- **`disallowedTools` takes a built-in tool out of the request, but not an MCP tool.** A disallowed `TodoWrite` or `Bash` leaves the context (3.4k and 1.9k input tokens fewer per call, measured); a disallowed in-process MCP tool is blocked, but its definition is still sent. Only not registering the server removes it.
- **`TodoWrite` only exists with `CLAUDE_CODE_ENABLE_TASKS=0`.** By default the CLI offers its `TaskCreate`, `TaskUpdate`, `TaskList` and `TaskGet` tools instead and drops `TodoWrite` from the session, even when `tools` names it; the kit passes that variable in `env` (with the rest of `process.env`). Each `TodoWrite` call carries the whole task list (`{ todos: [{ content, status, activeForm }] }`); its result only says it was saved.
- **`Read` reads PDFs and images, but refuses DOCX and PPTX** ("This tool cannot read binary files"). Hence `extract_text`.

## Subagents

- **A subagent can only use tools that are in the session's `tools`.** Otherwise the SDK refuses to spawn it ("would be spawned with zero tools… unrecognized [Bash]"). So `Bash` must be in the session for a subagent to use it.
- **The built-in `general-purpose` subagent type is always spawnable**, whatever `agents` declares, and inherits every tool of the session. Hence the type gate.
- **`agent_id` is set in a hook's input only for calls made inside a subagent.** The Bash gate uses it.
- **The `Agent` tool runs subagents in the background by default**, and a background subagent's result is lost if the host doesn't handle task messages. `AgentDefinition.background: false` doesn't change it; rewriting `run_in_background` in a `PreToolUse` hook does. Hence the foreground gate.
- **The `Agent` tool's input is `{ description, prompt, subagent_type }`.**

## Messages and results

- **A turn can report `subtype: "success"` with `is_error: true`** (an API error such as billing or access), with the real message in `result`. Check `is_error` (the kit's `failed`), not the subtype.
- **An unknown slash command produces a `system` message**, not text: without handling it, the session looks silent. The kit turns it into an `info` event, and the chats catch unknown commands before sending them.
- **An interrupted turn ends with an internal `[ede_diagnostic]` error line**; the kit filters it out.
- **Prompt suggestions arrive after their turn's `result`.**
- **The prompt iterable must stay open** for a multi-turn session: the SDK closes the transport when it ends ("ProcessTransport is not ready for writing" on the next message). Hence `createInputQueue()`.
- **`usage` and `total_cost_usd` in a result are cumulative** for the session in streaming input mode.

## Configuration and context

- **Without `settingSources`, every source is loaded**, the user's included, and a `language` setting there becomes a system prompt rule that outranks the agent's.
- **The runner's auto-memory is loaded whatever `settingSources` says**; `settings.autoMemoryEnabled: false` keeps it out.
- **The git context (with the runner's git user name) comes with the git instructions**; `settings.includeGitInstructions: false` drops it.
- **The claude.ai connectors of the logged-in account are loaded whatever `settingSources` says** (a session with `settingSources: []` got a connector's eight tools); `settings.disableClaudeAiConnectors: true` keeps them out. An MCP server passed in `mcpServers` is unaffected.
- **The logged-in account's name and e-mail are always in the context** (from `~/.claude.json`); only a separate `CLAUDE_CONFIG_DIR` avoids it.
- **Plugin commands work without being in the `skills` list.**
- **A plugin's skill is named after its folder**: `<plugin>:<folder>`, whatever its frontmatter's `name` says; a `SKILL.md` without frontmatter isn't loaded. A plugin's subagents (`agents/*.md`) are loaded too, as `<plugin>:<name>`.
- **About twenty skills come with the SDK itself** (`deep-research`, `dataviz`, `code-review`, `loop`…), even with `settingSources: []`: `skills` is what keeps them out of the context.
- **`getContextUsage()`'s split between categories can mislead** (skills counted as system tools when filtered), and before the first turn it counts in-process MCP tools as 0 tokens (15.5k estimated for a session whose first call took 23.7k); the API usage of a call is the reliable measure.

## Changing a running session

- **`toggleMcpServer(name, false)` takes a server given in `mcpServers` out of the session**: its tools leave the model's context (asked to call one, it says it has none) while the other servers keep working; `true` brings it back. The kit turns an installed extension off and on with it.
- **`setMcpServers()` leaves the servers given at start alone.** It replaces only the ones it added itself: removing a starting server from its set removes nothing (`removed: []`, still connected), and adding one back adds a second, dynamic copy.
- **`reloadPlugins()` re-reads the plugin folders given at start**: a folder emptied loses its skills, commands and subagents in the session, and filled again they come back. A plugin path the session didn't start with can't be added this way.

## Sessions

- **A `SessionStore` receives every transcript entry and is asked for them before resuming.** A resumed session keeps its id and remembers the conversation, subagents included, even with the CLI's own copy deleted. The CLI's copy is always written while a store is in use.
- **`CLAUDE_CONFIG_DIR` only moves the root** of the CLI's storage; `<dir>/projects/<encoded cwd>/` is fixed.

## Terminal

- **A non-TTY `readline.question()` still writes its question to stdout**, though it can never be answered; the kit skips readline entirely without a TTY.
- **readline tracks how many rows its prompt used** (`prevRows`), which goes stale when anything else writes to the terminal; the plain chat resets it after each write.
