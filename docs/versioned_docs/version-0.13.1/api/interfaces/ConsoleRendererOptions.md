# Interface: ConsoleRendererOptions

Defined in: [tui/consoleRenderer.ts:8](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L8)

Options of `createConsoleRenderer()`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agentlabel"></a> `agentLabel?` | `string` | Printed (already styled) before the first text of each turn, e.g. "my-agent>". | [tui/consoleRenderer.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L12) |
| <a id="property-formataction"></a> `formatAction?` | (`toolName`, `toolInput`) => `string` | Turns a tool call into its console label; defaults to `createFriendlyToolLabel()`. | [tui/consoleRenderer.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L10) |
| <a id="property-onwrite"></a> `onWrite?` | (`text`) => `void` | Called after every write with the same text, e.g. to mirror it into a log file. | [tui/consoleRenderer.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L16) |
| <a id="property-output"></a> `output?` | (`text`) => `void` | Where the text goes; defaults to `process.stdout`. | [tui/consoleRenderer.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L14) |
