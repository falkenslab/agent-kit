# Interface: KnowledgeOptions\<TConfig\>

Defined in: [extensions/knowledge/index.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/index.ts#L11)

The knowledge base's options.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](BaseSessionConfig.md) | [`BaseSessionConfig`](BaseSessionConfig.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | [`FolderOption`](../type-aliases/FolderOption.md)\<`TConfig`\> | The knowledge base's folder, reached only through its tools, never the file tools. Without a folder the extension is off. | [extensions/knowledge/index.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/index.ts#L13) |
| <a id="property-pagetypes"></a> `pageTypes?` | [`PageType`](PageType.md)[] | The agent's own page types, besides the kit's (summary, concept, entity, synthesis, preference): each with its folder (`""` for the root), index section, description (told to the model) and template. | [extensions/knowledge/index.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/index.ts#L19) |

## Methods

### store()?

```ts
optional store(config, dir): KnowledgeStore;
```

Defined in: [extensions/knowledge/index.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/index.ts#L21)

Its store, instead of the kit's over markdown files in `dir` (e.g. a database or a vector store implementing `KnowledgeStore`).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `TConfig` |
| `dir` | `string` |

#### Returns

[`KnowledgeStore`](KnowledgeStore.md)
