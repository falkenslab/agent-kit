# Interface: ProgressViewOptions

Defined in: [tui/ink/progressView.tsx:16](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L16)

Options of `createProgressView()`.

## Extends

- `Omit`\<[`ConsoleRendererOptions`](ConsoleRendererOptions.md), `"output"`\>

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-agentlabel"></a> `agentLabel?` | `string` | Printed (already styled) before the first text of each turn, e.g. "my-agent>". | [`ConsoleRendererOptions`](ConsoleRendererOptions.md).[`agentLabel`](ConsoleRendererOptions.md#property-agentlabel) | [tui/consoleRenderer.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L12) |
| <a id="property-formataction"></a> `formatAction?` | (`toolName`, `toolInput`) => `string` | Turns a tool call into its console label; defaults to `createFriendlyToolLabel()`. | [`ConsoleRendererOptions`](ConsoleRendererOptions.md).[`formatAction`](ConsoleRendererOptions.md#property-formataction) | [tui/consoleRenderer.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L10) |
| <a id="property-formatresult"></a> `formatResult?` | [`ResultFormatter`](../type-aliases/ResultFormatter.md) | The result line under a tool call (see `InkChatOptions.formatResult`). | - | [tui/ink/progressView.tsx:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L22) |
| <a id="property-language"></a> `language?` | `string` | The language of the kit's texts ("en", "es", "fr", "de"). `--language=<code>` on the command line wins; without either, the one `buildSessionOptions()` chose from `config.language`, or else the system's. | - | [tui/ink/progressView.tsx:40](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L40) |
| <a id="property-mode"></a> `mode?` | [`Mode`](../type-aliases/Mode.md) | Shown in the status bar. | - | [tui/ink/progressView.tsx:26](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L26) |
| <a id="property-onwrite"></a> `onWrite?` | (`text`) => `void` | Called after every write with the same text, e.g. to mirror it into a log file. | [`ConsoleRendererOptions`](ConsoleRendererOptions.md).[`onWrite`](ConsoleRendererOptions.md#property-onwrite) | [tui/consoleRenderer.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L16) |
| <a id="property-plain"></a> `plain?` | `boolean` | Use the plain console renderer even on a TTY. | - | [tui/ink/progressView.tsx:28](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L28) |
| <a id="property-renderapproval"></a> `renderApproval?` | [`RenderApproval`](../type-aliases/RenderApproval.md) | Replaces the default preview in the approval and manual-intervention panels. | - | [tui/ink/progressView.tsx:24](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L24) |
| <a id="property-theme"></a> `theme?` | `Partial`\<[`Theme`](Theme.md)\> | Colors for the kit's roles (see `Theme`), on top of the kit's defaults: only the roles given change, e.g. `{ toolResult: "yellow", selection: "#00ff00" }`. One theme per process: without this option, the one already set stays. | - | [tui/ink/progressView.tsx:34](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L34) |
| <a id="property-tooldetail"></a> `toolDetail?` | [`ToolDetail`](../type-aliases/ToolDetail.md) | How much of the tool calls shows (see `InkChatOptions.toolDetail`); "full" if not given. | - | [tui/ink/progressView.tsx:20](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L20) |
| <a id="property-toolphrase"></a> `toolPhrase?` | (`toolName`) => [`ToolPhrase`](../type-aliases/ToolPhrase.md) \| `undefined` | How one of the agent's own tools counts in a folded group's summary (see `InkChatOptions.toolPhrase`). | - | [tui/ink/progressView.tsx:18](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L18) |
