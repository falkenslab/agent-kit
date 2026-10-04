# Function: createStepGate()

```ts
function createStepGate(runDir, isActive?): HookCallback;
```

Defined in: [core/hooks/stepGate.ts:17](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/stepGate.ts#L17)

PreToolUse hook for "interactive" mode: pauses before every action and asks for
confirmation (by keyboard or by file, see humanInput.ts), like reviewing a plan step
by step.

`isActive` lets one session switch between "guided" and "interactive" while it runs (see
session.ts's `ModeControl`): the hook stays registered and, while inactive, gives no
decision at all, so the tool call goes on exactly as if the hook weren't there.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runDir` | `string` |
| `isActive` | () => `boolean` |

## Returns

`HookCallback`
