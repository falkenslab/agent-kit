# Interface: ExtensionManifest

Defined in: [core/extensions.ts:109](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L109)

An extension's manifest, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:111](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L111) |
| <a id="property-name"></a> `name` | `string` | - | [core/extensions.ts:110](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L110) |
| <a id="property-provides"></a> `provides` | `string`[] | Capabilities it lets the agent use. | [core/extensions.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L113) |
| <a id="property-requires"></a> `requires` | `string`[] | Capabilities it needs another enabled extension to provide. | [core/extensions.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L115) |
