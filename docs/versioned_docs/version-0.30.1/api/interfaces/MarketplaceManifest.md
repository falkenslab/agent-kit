# Interface: MarketplaceManifest

Defined in: [core/marketplaces.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L41)

A marketplace's `marketplace.json`, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description?` | `string` | - | [core/marketplaces.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L44) |
| <a id="property-name"></a> `name` | `string` | - | [core/marketplaces.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L42) |
| <a id="property-owner"></a> `owner` | `object` | - | [core/marketplaces.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L43) |
| `owner.email?` | `string` | - | [core/marketplaces.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L43) |
| `owner.name` | `string` | - | [core/marketplaces.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L43) |
| `owner.url?` | `string` | - | [core/marketplaces.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L43) |
| <a id="property-pluginroot"></a> `pluginRoot?` | `string` | Where bare plugin sources resolve, relative to the marketplace's root. | [core/marketplaces.ts:46](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L46) |
| <a id="property-plugins"></a> `plugins` | [`MarketplacePlugin`](MarketplacePlugin.md)[] | - | [core/marketplaces.ts:47](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L47) |
