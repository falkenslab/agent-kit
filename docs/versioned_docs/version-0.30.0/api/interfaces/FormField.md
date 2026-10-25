# Interface: FormField

Defined in: [core/elicitation.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L18)

One field of a form a server asks for, from its JSON Schema (MCP's flat, primitive one).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-default"></a> `default?` | `string` \| `number` \| `boolean` \| `string`[] | - | [core/elicitation.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L28) |
| <a id="property-description"></a> `description?` | `string` | - | [core/elicitation.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L21) |
| <a id="property-key"></a> `key` | `string` | - | [core/elicitation.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L19) |
| <a id="property-maximum"></a> `maximum?` | `number` | - | [core/elicitation.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L30) |
| <a id="property-minimum"></a> `minimum?` | `number` | - | [core/elicitation.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L29) |
| <a id="property-multiple"></a> `multiple?` | `boolean` | Several of `options` (an array of an enum). | [core/elicitation.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L26) |
| <a id="property-options"></a> `options?` | `object`[] | The values it may take (a choice), and what each is called, when the schema names them. | [core/elicitation.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L24) |
| <a id="property-required"></a> `required` | `boolean` | - | [core/elicitation.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L27) |
| <a id="property-title"></a> `title` | `string` | - | [core/elicitation.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L20) |
| <a id="property-type"></a> `type` | `"string"` \| `"number"` \| `"boolean"` \| `"integer"` | - | [core/elicitation.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L22) |
