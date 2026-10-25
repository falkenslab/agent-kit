# Interface: ExtensionConfirm

Defined in: [core/externalExtensions.ts:836](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L836)

What the person said about an extension's tools in guided mode (#74, #76), in its lock.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-off"></a> `off?` | `boolean` | Its tools run without asking: the person trusts it. | [core/externalExtensions.ts:838](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L838) |
| <a id="property-tools"></a> `tools?` | `Record`\<`string`, [`ToolConfirmation`](../type-aliases/ToolConfirmation.md)\> | Their kept answers, by the tool's short name. | [core/externalExtensions.ts:840](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L840) |
