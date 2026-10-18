# Interface: KnownMarketplace

Defined in: [core/marketplaces.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L51)

A marketplace an agent knows.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-commit"></a> `commit?` | `string` | The commit its copy was taken at, for a git one. | [core/marketplaces.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L56) |
| <a id="property-dir"></a> `dir` | `string` | Its copy, inside the agent's extensions folder. | [core/marketplaces.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L62) |
| <a id="property-manifest"></a> `manifest?` | [`MarketplaceManifest`](MarketplaceManifest.md) | - | [core/marketplaces.ts:63](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L63) |
| <a id="property-name"></a> `name` | `string` | - | [core/marketplaces.ts:52](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L52) |
| <a id="property-official"></a> `official` | `boolean` | The agent's own: known without asking, and its plugins installed without a confirmation. | [core/marketplaces.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L58) |
| <a id="property-source"></a> `source` | `string` | Where it came from: a folder, a git URL (`#ref`), or `owner/repo`. | [core/marketplaces.ts:54](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L54) |
| <a id="property-updated"></a> `updated` | `string` | When its copy was taken, ISO 8601 in UTC. | [core/marketplaces.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L60) |
