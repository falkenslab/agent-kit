# Function: quietResults()

```ts
function quietResults(labels): ToolLabels;
```

Defined in: [core/toolLabels.ts:103](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L103)

Labels whose result line is hidden when the call succeeded (#79): for tools whose label already
says what happened, so the person doesn't read the model's English under it. A failure still shows.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `labels` | [`ToolLabels`](../type-aliases/ToolLabels.md) |

## Returns

[`ToolLabels`](../type-aliases/ToolLabels.md)
