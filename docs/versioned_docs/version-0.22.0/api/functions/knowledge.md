# Function: knowledge()

```ts
function knowledge<TConfig>(options): Extension;
```

Defined in: [extensions/knowledge/index.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/index.ts#L28)

The built-in knowledge base (ADR-008, ADR-024): an interlinked wiki the agent keeps only through
its `knowledge_*` tools, over a `KnowledgeStore` (the kit's over markdown files, or the agent's
own). The host reads it through `apis.knowledge.knowledgeStore`.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) | [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`KnowledgeOptions`](../interfaces/KnowledgeOptions.md)\<`TConfig`\> |

## Returns

[`Extension`](../interfaces/Extension.md)
