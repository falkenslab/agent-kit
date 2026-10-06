# Interface: CheckReport

Defined in: [core/knowledgeStore.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L59)

What `check()` finds: the mechanical problems, for the agent to fix or report.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-brokenlinks"></a> `brokenLinks` | `object`[] | Links to pages that don't exist. | [core/knowledgeStore.ts:61](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L61) |
| <a id="property-linkstoretired"></a> `linksToRetired` | `object`[] | Links to retired pages. | [core/knowledgeStore.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L65) |
| <a id="property-orphans"></a> `orphans` | `string`[] | Pages nothing links to (summaries, syntheses and preferences aside, which the index reaches). | [core/knowledgeStore.ts:63](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L63) |
