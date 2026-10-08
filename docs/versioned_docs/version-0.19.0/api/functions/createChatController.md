# Function: createChatController()

```ts
function createChatController(options, settings?): Promise<{
  cwd: () => string;
  formatAction: (toolName, toolInput) => string;
  getState: () => ChatState;
  lastReply: () => string;
  notice: (text, tone) => void;
  toolPhrase: (toolName) => ToolPhrase | undefined;
  answer: void;
  api: T | undefined;
  choose: void;
  close: void;
  cycleMode: void;
  interrupt: void;
  listRuns: Promise<object[]>;
  newConversation: Promise<void>;
  onEvent: () => void;
  resume: Promise<void>;
  send: Promise<void | "exit">;
  setExtension: Promise<void>;
  setLanguage: Promise<void>;
  setMode: void;
  start: Promise<void>;
  subscribe: () => void;
  togglePlan: void;
}>;
```

Defined in: [chat/chatController.ts:160](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L160)

Opens the chat's session (the first run with a session opener, `--continue` picking the
latest) and loads the history; `start()` then draws the run's conversation and sends the
initial prompt, `send()` each line the person types.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `Options` \| [`SessionOpener`](../type-aliases/SessionOpener.md) |
| `settings` | [`ChatSettings`](../interfaces/ChatSettings.md) |

## Returns

`Promise`\<\{
  `cwd`: () => `string`;
  `formatAction`: (`toolName`, `toolInput`) => `string`;
  `getState`: () => [`ChatState`](../interfaces/ChatState.md);
  `lastReply`: () => `string`;
  `notice`: (`text`, `tone`) => `void`;
  `toolPhrase`: (`toolName`) => [`ToolPhrase`](../type-aliases/ToolPhrase.md) \| `undefined`;
  `answer`: `void`;
  `api`: `T` \| `undefined`;
  `choose`: `void`;
  `close`: `void`;
  `cycleMode`: `void`;
  `interrupt`: `void`;
  `listRuns`: `Promise`\<`object`[]\>;
  `newConversation`: `Promise`\<`void`\>;
  `onEvent`: () => `void`;
  `resume`: `Promise`\<`void`\>;
  `send`: `Promise`\<`void` \| `"exit"`\>;
  `setExtension`: `Promise`\<`void`\>;
  `setLanguage`: `Promise`\<`void`\>;
  `setMode`: `void`;
  `start`: `Promise`\<`void`\>;
  `subscribe`: () => `void`;
  `togglePlan`: `void`;
\}\>
