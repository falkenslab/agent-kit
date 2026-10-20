# Interface: CatalogEntry

Defined in: [core/extensionCatalog.ts:53](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L53)

One extension a marketplace offers, and how it stands in the agent.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-banner"></a> `banner?` | `string` | - | [core/extensionCatalog.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L72) |
| <a id="property-capabilities"></a> `capabilities` | [`DescribedCapability`](DescribedCapability.md)[] | What it lets the agent do (#62), in the kit's language: from its `plugin.json` when the marketplace has its folder. | [core/extensionCatalog.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L74) |
| <a id="property-description"></a> `description` | `string` | What it is, in the kit's language (#67): its own there, else the marketplace entry's, else its `plugin.json`'s, in English. | [core/extensionCatalog.ts:61](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L61) |
| <a id="property-installed"></a> `installed?` | [`InstalledExtension`](InstalledExtension.md) | Installed (and used: not shadowed), from wherever it came. | [core/extensionCatalog.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L65) |
| <a id="property-logo"></a> `logo?` | `string` | Its logo and banner (#59), as files of the marketplace's copy, when it has them. | [core/extensionCatalog.ts:71](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L71) |
| <a id="property-marketplace"></a> `marketplace` | `string` | - | [core/extensionCatalog.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L56) |
| <a id="property-official"></a> `official` | `boolean` | From the agent's own marketplace: installed without a confirmation. | [core/extensionCatalog.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L58) |
| <a id="property-plugin"></a> `plugin` | [`MarketplacePlugin`](MarketplacePlugin.md) | - | [core/extensionCatalog.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L59) |
| <a id="property-remote"></a> `remote` | `string`[] | The hosts its remote servers talk to (#61): what the agent sends there leaves the computer. | [core/extensionCatalog.ts:78](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L78) |
| <a id="property-requirements"></a> `requirements` | `object`[] | The programs it needs on the computer (#63), by name ("Docker"), with the capabilities that need them (none: all of it). | [core/extensionCatalog.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L76) |
| <a id="property-spec"></a> `spec` | `string` | `<name>@<marketplace>`, what installs it. | [core/extensionCatalog.ts:55](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L55) |
| <a id="property-topics"></a> `topics` | `string`[] | What it's about and who it's for (#59): its `plugin.json`'s `keywords` and its entry's `tags`, `keywords` and `category`, lowercased. | [core/extensionCatalog.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L69) |
| <a id="property-update"></a> `update` | `boolean` | Installed from this marketplace with an older version than it offers. | [core/extensionCatalog.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L67) |
| <a id="property-version"></a> `version?` | `string` | The version it offers: its `plugin.json`'s when the marketplace has its folder, else the marketplace's entry's. | [core/extensionCatalog.ts:63](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L63) |
