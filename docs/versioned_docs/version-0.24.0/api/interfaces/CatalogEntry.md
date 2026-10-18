# Interface: CatalogEntry

Defined in: [core/extensionCatalog.ts:52](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L52)

One extension a marketplace offers, and how it stands in the agent.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-banner"></a> `banner?` | `string` | - | [core/extensionCatalog.ts:71](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L71) |
| <a id="property-capabilities"></a> `capabilities` | [`DescribedCapability`](DescribedCapability.md)[] | What it lets the agent do (#62), in the kit's language: from its `plugin.json` when the marketplace has its folder. | [core/extensionCatalog.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L73) |
| <a id="property-description"></a> `description` | `string` | What it is, in the kit's language (#67): its own there, else the marketplace entry's, else its `plugin.json`'s, in English. | [core/extensionCatalog.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L60) |
| <a id="property-installed"></a> `installed?` | [`InstalledExtension`](InstalledExtension.md) | Installed (and used: not shadowed), from wherever it came. | [core/extensionCatalog.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L64) |
| <a id="property-logo"></a> `logo?` | `string` | Its logo and banner (#59), as files of the marketplace's copy, when it has them. | [core/extensionCatalog.ts:70](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L70) |
| <a id="property-marketplace"></a> `marketplace` | `string` | - | [core/extensionCatalog.ts:55](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L55) |
| <a id="property-official"></a> `official` | `boolean` | From the agent's own marketplace: installed without a confirmation. | [core/extensionCatalog.ts:57](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L57) |
| <a id="property-plugin"></a> `plugin` | [`MarketplacePlugin`](MarketplacePlugin.md) | - | [core/extensionCatalog.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L58) |
| <a id="property-requirements"></a> `requirements` | `object`[] | The programs it needs on the computer (#63), by name ("Docker"), with the capabilities that need them (none: all of it). | [core/extensionCatalog.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L75) |
| <a id="property-spec"></a> `spec` | `string` | `<name>@<marketplace>`, what installs it. | [core/extensionCatalog.ts:54](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L54) |
| <a id="property-topics"></a> `topics` | `string`[] | What it's about and who it's for (#59): its `plugin.json`'s `keywords` and its entry's `tags`, `keywords` and `category`, lowercased. | [core/extensionCatalog.ts:68](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L68) |
| <a id="property-update"></a> `update` | `boolean` | Installed from this marketplace with an older version than it offers. | [core/extensionCatalog.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L66) |
| <a id="property-version"></a> `version?` | `string` | The version it offers: its `plugin.json`'s when the marketplace has its folder, else the marketplace's entry's. | [core/extensionCatalog.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L62) |
