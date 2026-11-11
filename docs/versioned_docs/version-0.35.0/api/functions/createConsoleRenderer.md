# Function: createConsoleRenderer()

```ts
function createConsoleRenderer(options?): ConsoleRenderer;
```

Defined in: [tui/consoleRenderer.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L42)

The console rendering of `runQuery()`'s event stream, shared by `runChatTui()` and by any
one-shot run that prints the same events. Streamed text rarely ends in a newline, so
every other line (actions, notices, errors) starts by ending the current line only if
it isn't already ended — never with a fixed "\n", which leaves a blank line between
consecutive actions.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ConsoleRendererOptions`](../interfaces/ConsoleRendererOptions.md) |

## Returns

[`ConsoleRenderer`](../interfaces/ConsoleRenderer.md)
