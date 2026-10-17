# Function: createFileScopeGate()

```ts
function createFileScopeGate(scope): HookCallback;
```

Defined in: [core/hooks/fileScopeGate.ts:148](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L148)

PreToolUse hook enforcing `scope` on Read/Write/Edit/Grep/Glob, for the main agent and its
subagents alike. Bash, when a subagent has it, is not covered: it can reach any path,
which is why Bash-granting features stay opt-in.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | [`FileScope`](../interfaces/FileScope.md) |

## Returns

`HookCallback`
