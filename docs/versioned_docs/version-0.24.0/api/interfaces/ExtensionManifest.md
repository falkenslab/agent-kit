# Interface: ExtensionManifest

Defined in: [core/extensions.ts:195](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L195)

An extension's manifest, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`ExtensionCapability`](ExtensionCapability.md)[] | What it lets the agent do, described for the person (#62). | [core/extensions.ts:203](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L203) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:197](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L197) |
| <a id="property-name"></a> `name` | `string` | - | [core/extensions.ts:196](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L196) |
| <a id="property-provides"></a> `provides` | `string`[] | Capabilities it lets the agent use: its `provides`, and its `capabilities`' ids. | [core/extensions.ts:199](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L199) |
| <a id="property-requires"></a> `requires` | `string`[] | Capabilities it needs another enabled extension to provide. | [core/extensions.ts:201](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L201) |
