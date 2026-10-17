# Interface: AboutExtension

Defined in: [core/extensions.ts:203](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L203)

An active extension as a view lists it: its capabilities in the session's language, with their tools by full name.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | - | [core/extensions.ts:206](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L206) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensions.ts:204](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L204) |
| <a id="property-provides"></a> `provides` | `string`[] | - | [core/extensions.ts:205](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L205) |
| <a id="property-servers"></a> `servers` | `string`[] | Its MCP servers, by name. | [core/extensions.ts:210](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L210) |
| <a id="property-unavailable"></a> `unavailable` | [`DescribedCapability`](DescribedCapability.md) & `object`[] | What it can't do on this computer, with why (#63). | [core/extensions.ts:208](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L208) |
