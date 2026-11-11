# Interface: CheckReport

Defined in: [extensions/knowledge/knowledgeStore.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L60)

What `check()` finds: the mechanical problems, for the agent to fix or report.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-brokenlinks"></a> `brokenLinks` | `object`[] | Links to pages that don't exist. | [extensions/knowledge/knowledgeStore.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L62) |
| <a id="property-linkstoretired"></a> `linksToRetired` | `object`[] | Links to retired pages. | [extensions/knowledge/knowledgeStore.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L66) |
| <a id="property-orphans"></a> `orphans` | `string`[] | Pages nothing links to (summaries, syntheses and preferences aside, which the index reaches). | [extensions/knowledge/knowledgeStore.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L64) |
