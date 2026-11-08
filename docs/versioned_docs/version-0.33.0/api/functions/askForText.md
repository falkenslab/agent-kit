# Function: askForText()

```ts
function askForText(runDir, prompt): Promise<string>;
```

Defined in: [core/hooks/humanInput.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/humanInput.ts#L26)

A free-text answer, through the port's `askText()` (or `askDecision()` when it has none)
and the response file: trimmed, with its case kept.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runDir` | `string` |
| `prompt` | [`ApprovalPrompt`](../interfaces/ApprovalPrompt.md) |

## Returns

`Promise`\<`string`\>
