# Type Alias: ToolDescriber

```ts
type ToolDescriber = (shortName, input) => string | undefined;
```

Defined in: [core/toolLabels.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L72)

An agent's labels for its own tools: the tool's short name and input, to a label, or `undefined` for the kit's default.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `shortName` | `string` |
| `input` | `Record`\<`string`, `unknown`\> |

## Returns

`string` \| `undefined`
