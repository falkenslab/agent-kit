# Function: setSharedReadline()

```ts
function setSharedReadline(rl): void;
```

Defined in: [tui/terminalInteraction.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/terminalInteraction.ts#L22)

Registers the chat's `readline` interface, so checkpoints ask on it instead of opening a second one (`null` to unregister).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rl` | `Interface` \| `null` |

## Returns

`void`
