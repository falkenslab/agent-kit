# Function: askForChoice()

```ts
function askForChoice(
   runDir, 
   prompt, 
   options, 
   multiple?
): Promise<ChoiceAnswer>;
```

Defined in: [core/hooks/humanInput.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/humanInput.ts#L51)

A choice between `options`, through the port's `askChoice()` (or `askDecision()` with the
options numbered in the prompt) and the response file, which takes the same answer: the
numbers, or the person's own words.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `runDir` | `string` | `undefined` |
| `prompt` | [`ApprovalPrompt`](../interfaces/ApprovalPrompt.md) | `undefined` |
| `options` | readonly `string`[] | `undefined` |
| `multiple` | `boolean` | `false` |

## Returns

`Promise`\<[`ChoiceAnswer`](../interfaces/ChoiceAnswer.md)\>
