# ADR-003: Three cooperating subagent gates

## Decision

When a consumer registers subagents, three `PreToolUse` hooks confine them: `subagentBashGate` (Bash denied without `agent_id`, i.e. from the main thread), `subagentTypeGate` (`Agent` only for the registered types) and `subagentForegroundGate` (forces `run_in_background: false`).

## Motivation

The SDK refuses to spawn a subagent whose tools aren't in the session's tools, so `Agent` and `Bash` must be there; once there, Bash is directly usable by the main agent and bypasses `canUseTool` (confirmed empirically). The built-in `general-purpose` type is spawnable regardless of what is registered and inherits every session tool; a real consuming agent used it to reach Bash for a file deletion. Background subagents can vanish silently, and `AgentDefinition.background: false` doesn't prevent it (confirmed empirically).

## Consequences

All three matter: removing any one reopens a bypass. Re-read the three files together before touching subagent wiring. Bash is not covered by the file scope (ADR-007), so Bash-granting features stay opt-in in consumers.
