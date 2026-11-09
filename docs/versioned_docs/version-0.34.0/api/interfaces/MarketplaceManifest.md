# Interface: MarketplaceManifest

Defined in: [core/marketplaces.ts:39](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L39)

A marketplace's `marketplace.json`, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description?` | `string` | - | [core/marketplaces.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L42) |
| <a id="property-name"></a> `name` | `string` | - | [core/marketplaces.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L40) |
| <a id="property-owner"></a> `owner` | `object` | - | [core/marketplaces.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L41) |
| `owner.email?` | `string` | - | [core/marketplaces.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L41) |
| `owner.name` | `string` | - | [core/marketplaces.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L41) |
| `owner.url?` | `string` | - | [core/marketplaces.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L41) |
| <a id="property-pluginroot"></a> `pluginRoot?` | `string` | Where bare plugin sources resolve, relative to the marketplace's root. | [core/marketplaces.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L44) |
| <a id="property-plugins"></a> `plugins` | [`MarketplacePlugin`](MarketplacePlugin.md)[] | - | [core/marketplaces.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L45) |
