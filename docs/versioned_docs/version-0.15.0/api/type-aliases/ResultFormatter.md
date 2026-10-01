# Type Alias: ResultFormatter

```ts
type ResultFormatter = (toolName, result) => string | null | undefined;
```

Defined in: [tui/ink/toolGroup.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/toolGroup.ts#L36)

The line shown under a tool call for its result: a string replaces the kit's (plain text,
drawn in the result's color, or the error color if it failed), `null` hides it, and
`undefined` keeps the kit's (the result's first line).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |
| `result` | \{ `isError`: `boolean`; `text`: `string`; \} |
| `result.isError` | `boolean` |
| `result.text` | `string` |

## Returns

`string` \| `null` \| `undefined`
