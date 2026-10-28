# Interface: TranscriptCall

Defined in: [chat/chatController.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L93)

One tool call in the transcript.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children` | `string`[] | What a subagent it started did, by label. | [chat/chatController.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L99) |
| <a id="property-id"></a> `id?` | `string` | - | [chat/chatController.ts:94](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L94) |
| <a id="property-label"></a> `label` | `string` | - | [chat/chatController.ts:96](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L96) |
| <a id="property-result"></a> `result` | \| \{ `isError`: `boolean`; `text`: `string`; \} \| `null` | - | [chat/chatController.ts:97](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L97) |
| <a id="property-toolname"></a> `toolName` | `string` | - | [chat/chatController.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L95) |
