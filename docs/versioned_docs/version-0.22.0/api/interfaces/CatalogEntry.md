# Interface: CatalogEntry

Defined in: [core/extensionCatalog.ts:50](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L50)

One extension a marketplace offers, and how it stands in the agent.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-banner"></a> `banner?` | `string` | - | [core/extensionCatalog.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L67) |
| <a id="property-installed"></a> `installed?` | [`InstalledExtension`](InstalledExtension.md) | Installed (and used: not shadowed), from wherever it came. | [core/extensionCatalog.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L60) |
| <a id="property-logo"></a> `logo?` | `string` | Its logo and banner (#59), as files of the marketplace's copy, when it has them. | [core/extensionCatalog.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L66) |
| <a id="property-marketplace"></a> `marketplace` | `string` | - | [core/extensionCatalog.ts:53](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L53) |
| <a id="property-official"></a> `official` | `boolean` | From the agent's own marketplace: installed without a confirmation. | [core/extensionCatalog.ts:55](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L55) |
| <a id="property-plugin"></a> `plugin` | [`MarketplacePlugin`](MarketplacePlugin.md) | - | [core/extensionCatalog.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L56) |
| <a id="property-spec"></a> `spec` | `string` | `<name>@<marketplace>`, what installs it. | [core/extensionCatalog.ts:52](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L52) |
| <a id="property-topics"></a> `topics` | `string`[] | What it's about and who it's for (#59): its `plugin.json`'s `keywords` and its entry's `tags`, `keywords` and `category`, lowercased. | [core/extensionCatalog.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L64) |
| <a id="property-update"></a> `update` | `boolean` | Installed from this marketplace with an older version than it offers. | [core/extensionCatalog.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L62) |
| <a id="property-version"></a> `version?` | `string` | The version it offers: its `plugin.json`'s when the marketplace has its folder, else the marketplace's entry's. | [core/extensionCatalog.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L58) |
