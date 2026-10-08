# An agent served as an MCP server

Issue: [#51](https://github.com/falkenslab/agent-kit/issues/51)

## Goal

An agent built on the kit can run as an MCP server over stdio, so another agent (Claude Code, Claude Desktop, another agent on the kit) drives it with its own prompt, extensions and guardrails intact (ADR-027).

## Context

- The chat controller (`src/chat/chatController.ts`, ADR-026) already opens, resumes and drives a session without an interface: an MCP server is one more view of it.
- Run folders keep each conversation and resume it (ADR-020): a run is what an MCP caller's `session_id` names.
- Agents on the kit already use other MCP servers through `spec.mcpServers`; what's missing is the serving side.
- `@modelcontextprotocol/sdk` is installed only as the Agent SDK's peer dependency.
- The kit's human-in-the-loop answers through the `InteractionPort` (ADR-013) or the response file; over stdio there is no terminal, and the calling model must never answer for the human (ADR-027).
- This first version serves autonomous mode only; approvals over MCP elicitation and packaging an agent as a Claude Code plugin are later features.

## Changes

- `serveMcp(options, settings)` in a new `src/mcp/` (no terminal, like `src/chat/`), exported from `src/index.ts`: an MCP server over stdio on the chat controller.
- One tool, `ask({ message, session_id? })`: without `session_id` it starts a run, with it it resumes that run; it returns the turn's reply text and the `session_id`. Its name and description come from `spec.identity`.
- During a turn, MCP progress notifications with the tool labels, so a client's tool timeout doesn't cut long turns; a client's cancellation interrupts the turn.
- One turn per session at a time: a second `ask` on a busy session is an error, not a queue.
- Mode: autonomous only; `serveMcp()` refuses another mode at start with a clear error.
- Nothing writes to stdout but the transport: no console renderer, and an interaction port that answers nothing (the response file still works); the kit's logs go to stderr.
- A nesting limit: the depth travels in an environment variable to the servers the agent starts, and `ask` fails past a maximum (default 3).
- `@modelcontextprotocol/sdk` becomes a direct dependency.
- Captain Whiskers gets an `mcp` entry (`captain mcp`) and a README line to add it to Claude Code (`claude mcp add`).
- Tests: `ask` starts and resumes a run, a busy session is refused, a non-autonomous mode is refused, the depth limit holds (with `runQuery` replaced, as the controller's tests do).
- `architecture.md` (a `src/mcp/` layer), ADR-027 and a guide in `docs/content/` (serving an agent over MCP) follow.

## Acceptance

- `claude mcp add captain -- node <path>/captain.js mcp` and, in Claude Code, asking the captain something returns his reply; a second question with the same `session_id` remembers the first.
- A turn longer than the client's tool timeout completes thanks to progress notifications.
- Starting `serveMcp()` in guided mode fails with an error naming autonomous mode.
- Nothing but MCP messages reaches stdout during a session with tool calls.
- `verify` passes.
