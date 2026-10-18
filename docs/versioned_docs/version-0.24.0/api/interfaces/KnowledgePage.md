# Interface: KnowledgePage

Defined in: [extensions/knowledge/knowledgeStore.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L26)

One page, as the store returns it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-content"></a> `content` | `string` | The markdown body, links to other pages as ids. | [extensions/knowledge/knowledgeStore.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L34) |
| <a id="property-fields"></a> `fields` | `Record`\<`string`, `string`\> | Frontmatter fields besides type and title (aliases, file, url, updated, status...). | [extensions/knowledge/knowledgeStore.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L32) |
| <a id="property-id"></a> `id` | `string` | - | [extensions/knowledge/knowledgeStore.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L27) |
| <a id="property-linkedfrom"></a> `linkedFrom` | `string`[] | The pages that link to this one. | [extensions/knowledge/knowledgeStore.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L36) |
| <a id="property-slug"></a> `slug` | `string` | - | [extensions/knowledge/knowledgeStore.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L29) |
| <a id="property-title"></a> `title` | `string` | - | [extensions/knowledge/knowledgeStore.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L30) |
| <a id="property-type"></a> `type` | `string` | - | [extensions/knowledge/knowledgeStore.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L28) |
