# Interface: TranscriptCall

Defined in: [chat/chatController.ts:71](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L71)

One tool call in the transcript.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children` | `string`[] | What a subagent it started did, by label. | [chat/chatController.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L77) |
| <a id="property-id"></a> `id?` | `string` | - | [chat/chatController.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L72) |
| <a id="property-label"></a> `label` | `string` | - | [chat/chatController.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L74) |
| <a id="property-result"></a> `result` | \| \{ `isError`: `boolean`; `text`: `string`; \} \| `null` | - | [chat/chatController.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L75) |
| <a id="property-toolname"></a> `toolName` | `string` | - | [chat/chatController.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L73) |
