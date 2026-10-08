# Interface: PageType

Defined in: [extensions/knowledge/knowledgeStore.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L10)

A kind of page: one of the kit's, or one an agent declares (`AgentSpec.knowledgePageTypes`).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | What it holds and when to create one, in one line: told to the model. | [extensions/knowledge/knowledgeStore.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L18) |
| <a id="property-dir"></a> `dir` | `string` | Where a file store keeps its pages, relative to the knowledge folder; "" for the root. | [extensions/knowledge/knowledgeStore.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L14) |
| <a id="property-indexfields"></a> `indexFields?` | `string`[] | Frontmatter fields shown in the page's index line, e.g. `["mastery"]`. | [extensions/knowledge/knowledgeStore.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L22) |
| <a id="property-indexsection"></a> `indexSection` | `string` | Its section in the index, e.g. "Concepts". | [extensions/knowledge/knowledgeStore.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L16) |
| <a id="property-template"></a> `template` | `string` | The page's body skeleton (markdown, under its title), shown when one is created. | [extensions/knowledge/knowledgeStore.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L20) |
| <a id="property-type"></a> `type` | `string` | Its name, lowercase: `concept`, `topic`. Page ids start with it. | [extensions/knowledge/knowledgeStore.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L12) |
