# Interface: ExtensionManifest

Defined in: [core/extensions.ts:210](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L210)

An extension's manifest, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`ExtensionCapability`](ExtensionCapability.md)[] | What it lets the agent do, described for the person (#62). | [core/extensions.ts:218](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L218) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:212](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L212) |
| <a id="property-name"></a> `name` | `string` | - | [core/extensions.ts:211](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L211) |
| <a id="property-provides"></a> `provides` | `string`[] | Capabilities it lets the agent use: its `provides`, and its `capabilities`' ids. | [core/extensions.ts:214](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L214) |
| <a id="property-requires"></a> `requires` | `string`[] | Capabilities it needs another enabled extension to provide. | [core/extensions.ts:216](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L216) |
