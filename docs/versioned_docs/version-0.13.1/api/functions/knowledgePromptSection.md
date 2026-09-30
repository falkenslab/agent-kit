# Function: knowledgePromptSection()

```ts
function knowledgePromptSection(
   projectDir, 
   knowledgeDir, 
   sourcesDir?
): string;
```

Defined in: [core/knowledge.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledge.ts#L27)

The "Knowledge base" section appended to the system prompt: the layout and the working
rules. The exact page templates live in the `knowledge-pages` skill, to keep this short.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `projectDir` | `string` |
| `knowledgeDir` | `string` |
| `sourcesDir?` | `string` |

## Returns

`string`
