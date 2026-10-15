# Interface: TranscriptCall

Defined in: [chat/chatController.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L75)

One tool call in the transcript.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children` | `string`[] | What a subagent it started did, by label. | [chat/chatController.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L81) |
| <a id="property-id"></a> `id?` | `string` | - | [chat/chatController.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L76) |
| <a id="property-label"></a> `label` | `string` | - | [chat/chatController.ts:78](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L78) |
| <a id="property-result"></a> `result` | \| \{ `isError`: `boolean`; `text`: `string`; \} \| `null` | - | [chat/chatController.ts:79](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L79) |
| <a id="property-toolname"></a> `toolName` | `string` | - | [chat/chatController.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L77) |
