# Interface: RequirementCheck

Defined in: [core/extensionRequirements.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L31)

What checking a requirement found.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-at"></a> `at?` | `string` | The file its setting named, when the person set one: checked there, not on the `PATH`. | [core/extensionRequirements.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L36) |
| <a id="property-found"></a> `found` | `boolean` | On the `PATH`, or where its setting says. | [core/extensionRequirements.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L34) |
| <a id="property-ok"></a> `ok` | `boolean` | There, and new enough (or its version couldn't be read). | [core/extensionRequirements.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L40) |
| <a id="property-requirement"></a> `requirement` | [`ExtensionRequirement`](ExtensionRequirement.md) | - | [core/extensionRequirements.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L32) |
| <a id="property-version"></a> `version?` | `string` | The version it said, when it was asked and said one. | [core/extensionRequirements.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L38) |
