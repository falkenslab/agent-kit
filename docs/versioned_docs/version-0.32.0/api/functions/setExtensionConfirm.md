# Function: setExtensionConfirm()

```ts
function setExtensionConfirm(
   scopeDir, 
   name, 
   change
): Promise<boolean>;
```

Defined in: [core/externalExtensions.ts:859](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L859)

Changes what's kept about an installed extension's tools in guided mode: `off` turns the gate
off (or back on) for it; `tool` keeps an answer for one tool (`undefined` asks again);
`reset` forgets every kept answer. False when it isn't installed there.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scopeDir` | `string` |
| `name` | `string` |
| `change` | \{ `off?`: `boolean`; `reset?`: `boolean`; `tool?`: \{ `answer`: [`ToolConfirmation`](../type-aliases/ToolConfirmation.md) \| `undefined`; `name`: `string`; \}; \} |
| `change.off?` | `boolean` |
| `change.reset?` | `boolean` |
| `change.tool?` | \{ `answer`: [`ToolConfirmation`](../type-aliases/ToolConfirmation.md) \| `undefined`; `name`: `string`; \} |
| `change.tool.answer` | [`ToolConfirmation`](../type-aliases/ToolConfirmation.md) \| `undefined` |
| `change.tool.name` | `string` |

## Returns

`Promise`\<`boolean`\>
