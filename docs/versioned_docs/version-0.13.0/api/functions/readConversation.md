# Function: readConversation()

```ts
function readConversation(dir): Promise<ConversationMessage[]>;
```

Defined in: [core/runs.ts:193](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L193)

The human's messages and the agent's replies in a run's conversation, in order.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |

## Returns

`Promise`\<[`ConversationMessage`](../interfaces/ConversationMessage.md)[]\>
