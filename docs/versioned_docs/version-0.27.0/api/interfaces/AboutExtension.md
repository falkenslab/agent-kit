# Interface: AboutExtension

Defined in: [core/extensions.ts:230](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L230)

An active extension as a view lists it: its capabilities in the session's language, with their tools by full name.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | - | [core/extensions.ts:233](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L233) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:231](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L231) |
| <a id="property-provides"></a> `provides` | `string`[] | - | [core/extensions.ts:232](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L232) |
| <a id="property-servers"></a> `servers` | `string`[] | Its MCP servers, by name. | [core/extensions.ts:237](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L237) |
| <a id="property-unavailable"></a> `unavailable` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | What it can't do on this computer, with why (#63). | [core/extensions.ts:235](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L235) |
