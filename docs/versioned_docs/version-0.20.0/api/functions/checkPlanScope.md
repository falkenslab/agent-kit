# Function: checkPlanScope()

```ts
function checkPlanScope(
   scope, 
   toolName, 
   input
): string | undefined;
```

Defined in: [core/hooks/planGate.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/planGate.ts#L31)

The reason to deny `toolName` with `input` in plan mode, or `undefined` to let it through.
Anything not known to only read is denied, so a tool nobody thought of can't change
anything while the human reviews the plan.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | [`PlanScope`](../interfaces/PlanScope.md) |
| `toolName` | `string` |
| `input` | `Record`\<`string`, `unknown`\> |

## Returns

`string` \| `undefined`
