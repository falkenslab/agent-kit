# Function: knowledgePromptSection()

```ts
function knowledgePromptSection(
   projectDir, 
   knowledgeDir, 
   sourcesDir?, 
   options?
): string;
```

Defined in: [core/knowledge.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledge.ts#L58)

The "Knowledge base" section appended to the system prompt: the layout and the working
rules. With `tools` (the kit's default since ADR-024), for a knowledge base reached through
the `knowledge_*` tools, listing `pageTypes`; otherwise for one kept with the file tools,
whose page templates live in the `knowledge-pages` skill.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `projectDir` | `string` |
| `knowledgeDir` | `string` |
| `sourcesDir?` | `string` |
| `options?` | \{ `pageTypes?`: readonly [`PageType`](../interfaces/PageType.md)[]; `tools?`: `boolean`; \} |
| `options.pageTypes?` | readonly [`PageType`](../interfaces/PageType.md)[] |
| `options.tools?` | `boolean` |

## Returns

`string`
