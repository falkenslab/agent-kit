# Interface: ConsoleRendererOptions

Defined in: [tui/consoleRenderer.ts:9](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L9)

Options of `createConsoleRenderer()`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agentlabel"></a> `agentLabel?` | `string` | Printed (already styled) before the first text of each turn, e.g. "my-agent>". | [tui/consoleRenderer.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L13) |
| <a id="property-formataction"></a> `formatAction?` | (`toolName`, `toolInput`) => `string` | Turns a tool call into its console label; defaults to `createFriendlyToolLabel()`. | [tui/consoleRenderer.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L11) |
| <a id="property-onwrite"></a> `onWrite?` | (`text`) => `void` | Called after every write with the same text, e.g. to mirror it into a log file. | [tui/consoleRenderer.ts:17](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L17) |
| <a id="property-output"></a> `output?` | (`text`) => `void` | Where the text goes; defaults to `process.stdout`. | [tui/consoleRenderer.ts:15](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L15) |
