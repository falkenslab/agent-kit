# Function: sourcesPromptSection()

```ts
function sourcesPromptSection(projectDir, sourcesDir): string;
```

Defined in: [core/tools/saveToSources.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L113)

The "Sources" section appended to the system prompt whenever there's a sources folder, with or
without a knowledge base: what the originals are and how they come and go. `projectDir` and
`sourcesDir` give the folder's name as the model reads it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `projectDir` | `string` |
| `sourcesDir` | `string` |

## Returns

`string`
