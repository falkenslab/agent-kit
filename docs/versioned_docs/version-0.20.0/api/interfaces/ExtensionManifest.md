# Interface: ExtensionManifest

Defined in: [core/extensions.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L101)

An extension's manifest, as the kit reads it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:103](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L103) |
| <a id="property-name"></a> `name` | `string` | - | [core/extensions.ts:102](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L102) |
| <a id="property-provides"></a> `provides` | `string`[] | Capabilities it lets the agent use. | [core/extensions.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L105) |
| <a id="property-requires"></a> `requires` | `string`[] | Capabilities it needs another enabled extension to provide. | [core/extensions.ts:107](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L107) |
