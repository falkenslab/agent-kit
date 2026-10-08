# Interface: ChatSettings

Defined in: [chat/chatController.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L28)

What the controller needs besides the session: the chats' options it acts on.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agentlabel"></a> `agentLabel?` | `string` | The label before the agent's reply in the session log. | [chat/chatController.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L38) |
| <a id="property-commands"></a> `commands?` | `Record`\<`string`, () => `void` \| `Promise`\<`void`\>\> | The view's own commands, by name without the slash (a terminal's `/copy`): logged and kept in the history like any line, then run by the view. | [chat/chatController.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L60) |
| <a id="property-exitcommands"></a> `exitCommands?` | readonly `string`[] | Lines (trimmed, case-insensitive) that end the chat. Default `/exit`, `/quit`. | [chat/chatController.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L30) |
| <a id="property-formataction"></a> `formatAction?` | (`toolName`, `input`) => `string` | Tool call labels and folded-group phrases on top of the kit's and the extensions'. | [chat/chatController.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L48) |
| <a id="property-historylimit"></a> `historyLimit?` | `number` | - | [chat/chatController.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L41) |
| <a id="property-historypath"></a> `historyPath?` | `string` | The person's lines, kept across runs (↑/↓). | [chat/chatController.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L40) |
| <a id="property-initialprompt"></a> `initialPrompt?` | `string` | The first turn, sent before the person types anything, unless the run resumes a conversation. | [chat/chatController.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L32) |
| <a id="property-modecontrol"></a> `modeControl?` | [`ModeControl`](ModeControl.md) | Without one, the session's mode control and tool labels. | [chat/chatController.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L45) |
| <a id="property-panels"></a> `panels?` | `"view"` \| `"state"` | Who asks the person at a checkpoint: `"view"` (the default) leaves the interaction port to the view (a terminal's panels); `"state"` installs the controller's own, whose panel is the state's `panel`, answered with `answer()`. | [chat/chatController.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L66) |
| <a id="property-pick"></a> `pick?` | (`title`, `options`) => `Promise`\<`string` \| `null`\> | How a choice in place of the prompt is asked (the conversations of `/resume`): a terminal view asks it its way; without it, it's the state's `choice`, answered with `choose()`. | [chat/chatController.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L58) |
| <a id="property-promptlabel"></a> `promptLabel?` | `string` | The label before the person's lines in the session log. | [chat/chatController.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L36) |
| <a id="property-promptsuggestions"></a> `promptSuggestions?` | `boolean` | The SDK's prompt suggestions (on by default). | [chat/chatController.ts:53](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L53) |
| <a id="property-runquery"></a> `runQuery?` | (`prompt`, `options`) => [`AgentRun`](AgentRun.md) | Runs the agent: the SDK's (`runQuery()`) by default; another for tests, or a host of its own. | [chat/chatController.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L51) |
| <a id="property-runsdir"></a> `runsDir?` | `string` | With a session opener: where the runs are (required then). | [chat/chatController.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L43) |
| <a id="property-sessionlogpath"></a> `sessionLogPath?` | `string` | The session log without runs (with runs, each run's `session.log`). | [chat/chatController.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L34) |
| <a id="property-toollabels"></a> `toolLabels?` | `Readonly`\<`Record`\<`string`, [`ToolLabel`](ToolLabel.md)\>\> | - | [chat/chatController.ts:46](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L46) |
| <a id="property-toolphrase"></a> `toolPhrase?` | (`toolName`) => [`ToolPhrase`](../type-aliases/ToolPhrase.md) \| `undefined` | - | [chat/chatController.ts:49](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L49) |
