# Interface: ExtensionManifest

Defined in: [core/extensions.ts:181](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L181)

An extension's manifest, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`ExtensionCapability`](ExtensionCapability.md)[] | What it lets the agent do, described for the person (#62). | [core/extensions.ts:189](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L189) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:183](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L183) |
| <a id="property-name"></a> `name` | `string` | - | [core/extensions.ts:182](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L182) |
| <a id="property-provides"></a> `provides` | `string`[] | Capabilities it lets the agent use: its `provides`, and its `capabilities`' ids. | [core/extensions.ts:185](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L185) |
| <a id="property-requires"></a> `requires` | `string`[] | Capabilities it needs another enabled extension to provide. | [core/extensions.ts:187](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L187) |
