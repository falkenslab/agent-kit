# Function: createProgressView()

```ts
function createProgressView(options?): ProgressView;
```

Defined in: [tui/ink/progressView.tsx:111](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L111)

The Ink counterpart of `createConsoleRenderer()` for one-shot ("run"-style) sessions: the
same methods and the same text (so `onWrite` logs exactly what the console version
would), plus a spinner with the current action, approval panels and a status bar.
Checkpoints go through an Ink `InteractionPort` until `close()`.

Without a TTY or with `plain`, it is `createConsoleRenderer()` with a no-op `close()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ProgressViewOptions`](../interfaces/ProgressViewOptions.md) |

## Returns

[`ProgressView`](../interfaces/ProgressView.md)
