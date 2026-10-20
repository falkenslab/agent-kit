# Function: runChatInk()

```ts
function runChatInk(options, tuiOptions?): Promise<void>;
```

Defined in: [tui/ink/runChatInk.tsx:337](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/runChatInk.tsx#L337)

The Ink counterpart of `runChatTui()`, with the same options, session log and history
file: history in the scrollback, the reply streaming in place, a spinner with the
current action (and a subagent's), approval panels, "/command" completion and a status
bar. Checkpoints go through an Ink `InteractionPort` while the chat runs, so no second
stdin reader ever competes with Ink's; the response file keeps working as always.

With `fullscreen` it takes the whole terminal instead (see `InkChatOptions.fullscreen`).

Given a session opener instead of options, and `runsDir`, each run keeps its conversation
in its own folder and can be resumed: `--continue` on the command line starts with the
latest, and `/resume` picks one (see `ChatTuiOptions.runsDir`).

Without a TTY (piped, background) or with `plain`, it is `runChatTui()` unchanged.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `Options` \| [`SessionOpener`](../type-aliases/SessionOpener.md) |
| `tuiOptions` | [`InkChatOptions`](../interfaces/InkChatOptions.md) |

## Returns

`Promise`\<`void`\>
