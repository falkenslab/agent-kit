# Function: truncatePath()

```ts
function truncatePath(text, max?): string;
```

Defined in: [core/toolLabels.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L23)

Cuts a path to `max` characters from the front, with "…": unlike `truncate()` (which cuts
the tail off long freeform text), a path's most useful part, the file name, is at the end.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `text` | `string` | `undefined` |
| `max` | `number` | `60` |

## Returns

`string`
