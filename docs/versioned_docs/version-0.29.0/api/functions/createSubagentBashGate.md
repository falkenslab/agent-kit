# Function: createSubagentBashGate()

```ts
function createSubagentBashGate(): HookCallback;
```

Defined in: [core/hooks/subagentBashGate.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/subagentBashGate.ts#L29)

PreToolUse hook restricting the Bash tool to subagents only, never the main agent
directly. See session.ts's buildSessionOptions(), which attaches this hook whenever
`AgentSpec.buildSubagents()` returned something for this config.

Bash has to be present in the session's own `tools`/`allowedTools` for any subagent to
be able to use it at all: the SDK refuses to spawn a subagent whose own
`AgentDefinition.tools` names anything not already present in the session's tools
("would be spawned with zero tools... unrecognized [Bash]", confirmed empirically). But
once it's there, it's also available to the main agent directly and bypasses
`canUseTool` entirely for built-in tools like Bash (also confirmed empirically — this is
why allowAnyMcpTool in mcpPermissions.ts, which only ever gated mcp__* tools, can't help
here) — a PreToolUse hook is the mechanism the SDK's own
CLAUDE_SDK_CAN_USE_TOOL_SHADOWED warning points at for gating a tool call by call.

The hook input's `agent_id` field is present only when the call originates from within
a subagent (confirmed empirically, matching its own doc comment in sdk.d.ts: "Absent
for the main thread... Use this field (not agent_type) to distinguish subagent calls
from main-thread calls.") — so denying Bash exactly when `agent_id` is absent confines
it to subagent use without needing per-subagent sandboxing here. That "without needing
per-subagent sandboxing" only holds together with subagentTypeGate.ts's sibling hook,
registered right alongside this one in session.ts: without it, the SDK's own built-in
"general-purpose" subagent_type is spawnable regardless of what `agents` declares,
inherits Bash the same as an intended subagent (agent_id set either way), and has no
AgentDefinition.tools list narrowing what it can do with it.

## Returns

`HookCallback`
