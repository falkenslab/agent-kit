# Interface: PageType

Defined in: [core/knowledgeStore.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L10)

A kind of page: the kit's four, or one an agent declares (`AgentSpec.knowledgePageTypes`).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | What it holds and when to create one, in one line: told to the model. | [core/knowledgeStore.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L18) |
| <a id="property-dir"></a> `dir` | `string` | Where a file store keeps its pages, relative to the knowledge folder; "" for the root. | [core/knowledgeStore.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L14) |
| <a id="property-indexfields"></a> `indexFields?` | `string`[] | Frontmatter fields shown in the page's index line, e.g. `["mastery"]`. | [core/knowledgeStore.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L22) |
| <a id="property-indexsection"></a> `indexSection` | `string` | Its section in the index, e.g. "Concepts". | [core/knowledgeStore.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L16) |
| <a id="property-template"></a> `template` | `string` | The page's body skeleton (markdown, under its title), shown when one is created. | [core/knowledgeStore.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L20) |
| <a id="property-type"></a> `type` | `string` | Its name, lowercase: `concept`, `topic`. Page ids start with it. | [core/knowledgeStore.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L12) |
