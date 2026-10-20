# Function: knowledgePromptSection()

```ts
function knowledgePromptSection(options?): string;
```

Defined in: [extensions/knowledge/prompt.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/prompt.ts#L64)

The "Knowledge base" section appended to the system prompt: the layers and the working rules,
listing `pageTypes`, for a knowledge base reached through the `knowledge_*` tools (ADR-024).
With a sources folder, also how summaries and originals are matched (by the model, with the
two extensions' tools: each owns its data, #30); the folder itself is the sources' section.
`preferences` (the active `preference` pages) are listed by title, up to `PREFERENCES_IN_PROMPT`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `pageTypes?`: readonly [`PageType`](../interfaces/PageType.md)[]; `preferences?`: readonly `object`[]; `withSources?`: `boolean`; \} |
| `options.pageTypes?` | readonly [`PageType`](../interfaces/PageType.md)[] |
| `options.preferences?` | readonly `object`[] |
| `options.withSources?` | `boolean` |

## Returns

`string`
