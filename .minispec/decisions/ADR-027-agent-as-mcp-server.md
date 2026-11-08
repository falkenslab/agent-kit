# ADR-027: An agent can serve itself over MCP, and the human stays its gate

## Decision

Proposed 8 October 2026; first version implemented 8 November 2026 (#51). An agent built on the kit can run as an MCP server, so other agents drive it as a whole: its prompt, extensions, modes and gates, in its own process.

- **Its own subpath.** `serveMcp()` is exported from `@falkenslab/agent-kit/mcp`, not the package root: an agent that doesn't serve itself doesn't load it. It's the one exception to ADR-011's single entry point.
- **A caller's message is never a command.** It goes to the agent as it is, through the controller's `turn()`: read as a chat line, `/extensions install` would let the caller change the agent.
- **Room for another transport.** Nothing in `ask`, `session_id` or the progress reporting is MCP-specific beyond the wire format. A2A was weighed on 8 November 2026 and left out: it brings an HTTP server, authentication and exposure, and no consumer asks for it. If one does, it's a separate package on the same controller (a session is A2A's `contextId`, a turn a task).

- **A view of the chat controller.** The MCP server is one more view of the chat controller (ADR-026), in its own layer (`src/mcp/`), like the terminal chats and an agent's graphical host. It exposes the agent, not its tools: one `ask` tool with a `session_id` that names a run (ADR-020).
- **stdio first.** The caller starts the agent as a process. HTTP is left for later: it brings authentication and exposure the stdio transport doesn't have.
- **The calling model never answers for the human.** Approvals, manual interventions and choices travel as MCP elicitation requests to the client, which shows them to its human; an agent on the kit that drives another wires the SDK's `onElicitation` to its own `InteractionPort` (ADR-013), so the question reaches the person at the top. A client without elicitation gets autonomous mode only. The first version serves autonomous mode only.
- **Becoming a Claude Code subagent is a separate thing.** Packaging an agent as a plugin (an `agents/*.md` and an `.mcp.json` with its tools) makes it a native subagent of whoever installs it, but under the caller's model and loop: a later, separate feature on the marketplaces (#29).

## Motivation

- An agent on the kit is a specialist (a Moodle teacher's assistant, a student); letting others delegate to it whole, instead of copying its prompt and tools, keeps its guardrails where they are: in its hooks (ADR-003, ADR-007), not in the caller's prompt.
- The kit already has the pieces: a core and a controller without a terminal (ADR-001, ADR-026), resumable runs (ADR-020), and agents that consume MCP servers.
- Rejected: **returning an approval to the caller as a tool result** (the calling model would approve itself, a guardrail turned into a prompt); **exposing the agent's tools one by one** (the caller would get the tools without the agent's judgment, prompt or gates); **queuing turns on a busy session** (a caller's retries would pile up turns nobody waits for).

## Consequences

- `@modelcontextprotocol/sdk` becomes a direct dependency, and its version follows the Agent SDK's peer range.
- While serving over stdio, stdout belongs to the transport: nothing in the kit may print there, and the terminal interaction port can't be the one installed.
- A turn can last minutes: progress notifications keep the client from timing out, and the client's cancellation interrupts the turn.
- Each nested agent is a Claude Code process with its own context and cost; a depth limit, passed down in the environment, stops loops (A asks B asks A). It reaches the agent's own servers, never an installed extension's: their environment stays stripped and no server gets the kit's variables (decided 8 November 2026), so a chain through an extension counts from zero again.
- Each agent authenticates on its own; over stdio it inherits the caller's environment (ADR-009).
- Elicitation depends on the client: until a client supports it, an agent served to it runs autonomous, and its guardrails are only its hooks.
