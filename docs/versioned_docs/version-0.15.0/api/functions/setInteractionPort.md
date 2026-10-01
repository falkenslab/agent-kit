# Function: setInteractionPort()

```ts
function setInteractionPort(port): void;
```

Defined in: [core/interaction.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L34)

Installs the port every checkpoint asks through (`null`: answer through the response file only). One per process.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `port` | [`InteractionPort`](../interfaces/InteractionPort.md) \| `null` |

## Returns

`void`
