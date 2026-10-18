# Interface: AboutExtension

Defined in: [core/extensions.ts:217](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L217)

An active extension as a view lists it: its capabilities in the session's language, with their tools by full name.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | - | [core/extensions.ts:220](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L220) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:218](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L218) |
| <a id="property-provides"></a> `provides` | `string`[] | - | [core/extensions.ts:219](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L219) |
| <a id="property-servers"></a> `servers` | `string`[] | Its MCP servers, by name. | [core/extensions.ts:224](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L224) |
| <a id="property-unavailable"></a> `unavailable` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | What it can't do on this computer, with why (#63). | [core/extensions.ts:222](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L222) |
