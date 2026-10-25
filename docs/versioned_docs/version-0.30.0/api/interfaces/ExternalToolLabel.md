# Interface: ExternalToolLabel

Defined in: [core/externalExtensions.ts:97](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L97)

How the chat shows one of its tools in one language: `{field}` takes the call's input.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-label"></a> `label` | `string` | - | [core/externalExtensions.ts:98](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L98) |
| <a id="property-phrase"></a> `phrase?` | [`ToolPhrase`](../type-aliases/ToolPhrase.md) | - | [core/externalExtensions.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L99) |
| <a id="property-result"></a> `result?` | `string` | The line under the call when it succeeded, instead of its result's first line, written for the model (#79). | [core/externalExtensions.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L101) |
