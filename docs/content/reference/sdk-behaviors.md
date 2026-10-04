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
- **`TodoWrite` is accepted in an explicit `tools` list**, and each call carries the whole task list (`{ todos: [{ content, status, activeForm }] }`); its result only says it was saved.
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
- **The logged-in account's name and e-mail are always in the context** (from `~/.claude.json`); only a separate `CLAUDE_CONFIG_DIR` avoids it.
- **Plugin commands work without being in the `skills` list.**
- **`getContextUsage()`'s split between categories can mislead** (skills counted as system tools when filtered); the API usage of a call is the reliable measure.

## Sessions

- **A `SessionStore` receives every transcript entry and is asked for them before resuming.** A resumed session keeps its id and remembers the conversation, subagents included, even with the CLI's own copy deleted. The CLI's copy is always written while a store is in use.
- **`CLAUDE_CONFIG_DIR` only moves the root** of the CLI's storage; `<dir>/projects/<encoded cwd>/` is fixed.

## Terminal

- **A non-TTY `readline.question()` still writes its question to stdout**, though it can never be answered; the kit skips readline entirely without a TTY.
- **readline tracks how many rows its prompt used** (`prevRows`), which goes stale when anything else writes to the terminal; the plain chat resets it after each write.
