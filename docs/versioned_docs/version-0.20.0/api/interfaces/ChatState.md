# Interface: ChatState

Defined in: [chat/chatController.ts:98](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L98)

The chat's state: plain data, the same for any view.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-activity"></a> `activity` | `string` \| `null` | The label of the agent's latest action in this turn, and of a subagent's. | [chat/chatController.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L104) |
| <a id="property-busy"></a> `busy` | `boolean` | A turn is running. | [chat/chatController.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L101) |
| <a id="property-choice"></a> `choice` | \| \{ `options`: `object`[]; `title`: `string`; \} \| `null` | A choice waiting for an answer (without `pick`). | [chat/chatController.ts:128](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L128) |
| <a id="property-closed"></a> `closed` | `boolean` | - | [chat/chatController.ts:132](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L132) |
| <a id="property-commanddetails"></a> `commandDetails` | `object`[] | The same, with what each does and what it takes after it, for a view that lists them. | [chat/chatController.ts:120](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L120) |
| <a id="property-commands"></a> `commands` | `string`[] | The slash commands the person can type: the session's and the chat's own. | [chat/chatController.ts:118](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L118) |
| <a id="property-contextpercent"></a> `contextPercent` | `number` \| `null` | How full the context window is (0-100), after the latest turn. | [chat/chatController.ts:114](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L114) |
| <a id="property-extensions"></a> `extensions` | [`ExtensionsStatus`](ExtensionsStatus.md) \| `null` | - | [chat/chatController.ts:131](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L131) |
| <a id="property-history"></a> `history` | `string`[] | The person's earlier lines, oldest first. | [chat/chatController.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L124) |
| <a id="property-language"></a> `language` | [`Language`](../type-aliases/Language.md) | The kit's language now (it can change: `setLanguage()`). | [chat/chatController.ts:122](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L122) |
| <a id="property-mode"></a> `mode` | [`Mode`](../type-aliases/Mode.md) \| `null` | - | [chat/chatController.ts:108](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L108) |
| <a id="property-panel"></a> `panel` | [`ChatPanel`](../type-aliases/ChatPanel.md) \| `null` | A checkpoint waiting for an answer (`panels: "state"`). | [chat/chatController.ts:126](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L126) |
| <a id="property-run"></a> `run` | [`RunFolder`](RunFolder.md) \| `null` | The run in use, with runs. | [chat/chatController.ts:130](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L130) |
| <a id="property-subagentactivity"></a> `subagentActivity` | `string` \| `null` | - | [chat/chatController.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L105) |
| <a id="property-suggestion"></a> `suggestion` | `string` \| `null` | The model's predicted next prompt. | [chat/chatController.ts:116](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L116) |
| <a id="property-switchablemodes"></a> `switchableModes` | readonly [`Mode`](../type-aliases/Mode.md)[] | The modes the person can switch between (none in autonomous mode). | [chat/chatController.ts:110](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L110) |
| <a id="property-todos"></a> `todos` | `Todo`[] \| `null` | The agent's task list while any task is open. | [chat/chatController.ts:107](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L107) |
| <a id="property-transcript"></a> `transcript` | [`TranscriptEntry`](../type-aliases/TranscriptEntry.md)[] | - | [chat/chatController.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L99) |
| <a id="property-turns"></a> `turns` | `number` | - | [chat/chatController.ts:111](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L111) |
| <a id="property-turnstartedat"></a> `turnStartedAt` | `number` \| `null` | - | [chat/chatController.ts:102](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L102) |
| <a id="property-usage"></a> `usage` | [`SessionUsage`](SessionUsage.md) \| `null` | - | [chat/chatController.ts:112](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L112) |
