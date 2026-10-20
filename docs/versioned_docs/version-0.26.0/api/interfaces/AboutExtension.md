# Interface: AboutExtension

Defined in: [core/extensions.ts:223](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L223)

An active extension as a view lists it: its capabilities in the session's language, with their tools by full name.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | - | [core/extensions.ts:226](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L226) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:224](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L224) |
| <a id="property-provides"></a> `provides` | `string`[] | - | [core/extensions.ts:225](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L225) |
| <a id="property-servers"></a> `servers` | `string`[] | Its MCP servers, by name. | [core/extensions.ts:230](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L230) |
| <a id="property-unavailable"></a> `unavailable` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | What it can't do on this computer, with why (#63). | [core/extensions.ts:228](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L228) |
