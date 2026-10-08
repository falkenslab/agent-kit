# Function: withToolPhrases()

```ts
function withToolPhrases(labels, toolPhrase?): (toolName) => ToolPhrase | undefined;
```

Defined in: [core/toolLabels.ts:107](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L107)

A `toolPhrase` that counts the tools in `labels()` with their phrase, and any other with `toolPhrase`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `labels` | () => \| `Readonly`\<`Record`\<`string`, [`ToolLabel`](../interfaces/ToolLabel.md)\>\> \| `undefined` |
| `toolPhrase?` | (`toolName`) => [`ToolPhrase`](../type-aliases/ToolPhrase.md) \| `undefined` |

## Returns

(`toolName`) => [`ToolPhrase`](../type-aliases/ToolPhrase.md) \| `undefined`
