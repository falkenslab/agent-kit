# Function: togglePlanMode()

```ts
function togglePlanMode(control): Mode | null;
```

Defined in: [core/session.ts:282](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L282)

What the chats' `/plan` does: switches `control` into plan mode, or, when it's already
there, back to the mode it was entered from ("guided" if it started in plan mode). Returns
the new mode, or `null` when this session can't be in plan mode (an autonomous one).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `control` | [`ModeControl`](../interfaces/ModeControl.md) |

## Returns

[`Mode`](../type-aliases/Mode.md) \| `null`
