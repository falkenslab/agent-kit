# Function: withToolResults()

```ts
function withToolResults(labels, formatResult?): (toolName, result) => string | null | undefined;
```

Defined in: [core/toolLabels.ts:138](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L138)

A result formatter (the Ink chat's `formatResult`) that asks `formatResult` first, then the
tools' labels (`ToolLabel.result`, #79): `undefined` from both keeps the result's first line.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `labels` | () => \| `Readonly`\<`Record`\<`string`, [`ToolLabel`](../interfaces/ToolLabel.md)\>\> \| `undefined` |
| `formatResult?` | (`toolName`, `result`) => `string` \| `null` \| `undefined` |

## Returns

(`toolName`, `result`) => `string` \| `null` \| `undefined`
