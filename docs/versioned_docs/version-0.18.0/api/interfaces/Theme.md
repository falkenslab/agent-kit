# Interface: Theme

Defined in: [tui/theme.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L12)

The terminal UI's colors, by what they're for.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-accent"></a> `accent` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The border of the approval and manual-intervention panels (a name or a hex). | [tui/theme.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L20) |
| <a id="property-action"></a> `action` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The plain console's `[action]` lines. | [tui/theme.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L40) |
| <a id="property-agent"></a> `agent` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The agent's replies and its label. | [tui/theme.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L14) |
| <a id="property-border"></a> `border` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The frame around the prompt and the /resume list. | [tui/theme.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L34) |
| <a id="property-code"></a> `code` | [`ThemeColor`](../type-aliases/ThemeColor.md) | Inline code and code blocks in the agent's replies. | [tui/theme.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L24) |
| <a id="property-dim"></a> `dim` | [`ThemeColor`](../type-aliases/ThemeColor.md) | Secondary text: notices, summaries, hints. | [tui/theme.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L36) |
| <a id="property-error"></a> `error` | [`ThemeColor`](../type-aliases/ThemeColor.md) | - | [tui/theme.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L43) |
| <a id="property-heading"></a> `heading` | [`ThemeColor`](../type-aliases/ThemeColor.md) | Titles (checkpoints, the wizard's questions). | [tui/theme.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L38) |
| <a id="property-selection"></a> `selection` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The focused option of a choice list (approval panels, /resume, the wizard), in bold. | [tui/theme.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L32) |
| <a id="property-success"></a> `success` | [`ThemeColor`](../type-aliases/ThemeColor.md) | - | [tui/theme.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L41) |
| <a id="property-toolbullet"></a> `toolBullet` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The `●` before each tool call. | [tui/theme.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L26) |
| <a id="property-toollabel"></a> `toolLabel` | [`ThemeColor`](../type-aliases/ThemeColor.md) | A tool call's label (`● Reading notes.md`). | [tui/theme.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L28) |
| <a id="property-toolresult"></a> `toolResult` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The one-line result under a tool call (`⎿ …`); an error is `error` instead. | [tui/theme.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L30) |
| <a id="property-user"></a> `user` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The human's prompt label. | [tui/theme.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L16) |
| <a id="property-userbar"></a> `userBar` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The background of the human's lines in the Ink chat (a name or a hex). | [tui/theme.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L18) |
| <a id="property-warn"></a> `warn` | [`ThemeColor`](../type-aliases/ThemeColor.md) | - | [tui/theme.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L42) |
| <a id="property-working"></a> `working` | [`ThemeColor`](../type-aliases/ThemeColor.md) | The spinner with what the agent is doing, and the mode in the status bar. | [tui/theme.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L22) |
