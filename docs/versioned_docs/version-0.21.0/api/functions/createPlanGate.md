# Function: createPlanGate()

```ts
function createPlanGate(scope, isActive): HookCallback;
```

Defined in: [core/hooks/planGate.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/planGate.ts#L51)

PreToolUse hook for "plan" mode: the agent only reads and plans (see checkPlanScope()).
Registered for every session that can be in plan mode and deciding only while `isActive()`
says it is; otherwise it gives no decision, so the call goes on as if it weren't there.
It's the kit's own gate, not the SDK's `permissionMode: "plan"` (ADR-023).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | [`PlanScope`](../interfaces/PlanScope.md) |
| `isActive` | () => `boolean` |

## Returns

`HookCallback`
