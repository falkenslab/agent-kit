# Interface: TranscriptCall

Defined in: [chat/chatController.ts:83](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L83)

One tool call in the transcript.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children` | `string`[] | What a subagent it started did, by label. | [chat/chatController.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L89) |
| <a id="property-id"></a> `id?` | `string` | - | [chat/chatController.ts:84](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L84) |
| <a id="property-label"></a> `label` | `string` | - | [chat/chatController.ts:86](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L86) |
| <a id="property-result"></a> `result` | \| \{ `isError`: `boolean`; `text`: `string`; \} \| `null` | - | [chat/chatController.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L87) |
| <a id="property-toolname"></a> `toolName` | `string` | - | [chat/chatController.ts:85](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L85) |
