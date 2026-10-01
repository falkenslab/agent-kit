# Function: askForManualIntervention()

```ts
function askForManualIntervention(runDir, prompt): Promise<string>;
```

Defined in: [core/hooks/humanInput.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/humanInput.ts#L22)

Like `askForDecision()`, for a manual-intervention checkpoint (see tools/manualLogin.ts).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runDir` | `string` |
| `prompt` | [`ApprovalPrompt`](../interfaces/ApprovalPrompt.md) |

## Returns

`Promise`\<`string`\>
