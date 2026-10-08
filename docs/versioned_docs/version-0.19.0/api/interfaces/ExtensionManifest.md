# Interface: ExtensionManifest

Defined in: [core/extensions.ts:90](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L90)

An extension's manifest, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:92](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L92) |
| <a id="property-name"></a> `name` | `string` | - | [core/extensions.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L91) |
| <a id="property-provides"></a> `provides` | `string`[] | Capabilities it lets the agent use. | [core/extensions.ts:94](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L94) |
| <a id="property-requires"></a> `requires` | `string`[] | Capabilities it needs another enabled extension to provide. | [core/extensions.ts:96](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L96) |
