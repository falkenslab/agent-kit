# Function: withToolLabels()

```ts
function withToolLabels(labels, formatAction?): (toolName, toolInput) => string;
```

Defined in: [core/toolLabels.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L95)

A `formatAction` that shows the tools in `labels()` with their label, and any other with
`formatAction` (the kit's by default). `labels` is read on every call, so it can follow the
session in use (`/resume` opens another).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `labels` | () => \| `Readonly`\<`Record`\<`string`, [`ToolLabel`](../interfaces/ToolLabel.md)\>\> \| `undefined` |
| `formatAction` | (`toolName`, `toolInput`) => `string` |

## Returns

(`toolName`, `toolInput`) => `string`
