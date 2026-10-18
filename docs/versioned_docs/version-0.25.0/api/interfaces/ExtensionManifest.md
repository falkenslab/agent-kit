# Interface: ExtensionManifest

Defined in: [core/extensions.ts:201](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L201)

An extension's manifest, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`ExtensionCapability`](ExtensionCapability.md)[] | What it lets the agent do, described for the person (#62). | [core/extensions.ts:209](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L209) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:203](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L203) |
| <a id="property-name"></a> `name` | `string` | - | [core/extensions.ts:202](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L202) |
| <a id="property-provides"></a> `provides` | `string`[] | Capabilities it lets the agent use: its `provides`, and its `capabilities`' ids. | [core/extensions.ts:205](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L205) |
| <a id="property-requires"></a> `requires` | `string`[] | Capabilities it needs another enabled extension to provide. | [core/extensions.ts:207](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L207) |
