# Function: createSubagentTypeGate()

```ts
function createSubagentTypeGate(allowedTypes): HookCallback;
```

Defined in: [core/hooks/subagentTypeGate.ts:17](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/subagentTypeGate.ts#L17)

PreToolUse hook restricting the Agent tool to the subagent types this session actually
registered (session.ts's `agents: {...}`, from `AgentSpec.buildSubagents()`) —
confirmed empirically that the Agent SDK also exposes a built-in "general-purpose"
subagent_type regardless of what `agents` lists, and that spawning one that way
inherits the *whole* session's own tools (including Bash, whenever any opt-in subagent
turned it on) rather than the narrow `AgentDefinition.tools` each declared subagent
actually declares. Without this hook, that built-in type is a way to route around
subagentBashGate.ts entirely: once inside it, `agent_id` is set exactly like an
intended subagent, so the Bash-from-main-thread check alone can't tell them apart —
this is exactly what happened in practice in a real consuming agent (the model delegated a plain
file deletion to a spontaneous "general-purpose" agent to get at Bash, instead of using
its own tools and leaving the stray file alone).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `allowedTypes` | readonly `string`[] |

## Returns

`HookCallback`
