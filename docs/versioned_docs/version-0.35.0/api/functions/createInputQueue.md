# Function: createInputQueue()

```ts
function createInputQueue(options?): object;
```

Defined in: [core/session.ts:700](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L700)

User message queue backed by a single long-lived generator, for any multi-turn
(chat-shaped) caller of `query()`.

The SDK closes the transport as soon as the AsyncIterable passed as `prompt` (or to
`streamInput()`) finishes iterating — so a "one message and done" generator leaves the
transport closed right after sending that message, and the next call blows up with
"ProcessTransport is not ready for writing". A real multi-turn conversation needs a
single generator that never finishes on its own: messages get pushed into it with
`push()` and it's only explicitly closed with `end()` when leaving the chat.

With `modeControl`, each message goes after the note on a plan-mode switch the model
hasn't been told about yet (`ModeControl.takeNotice()`).

`push(text, { priority: "next" })` is for a turn already running: the message joins it at its
next tool boundary without stopping it, or gets a turn of its own when no tool call is left
(confirmed empirically, SDK 0.3.300; `"now"` would cut the running tool).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `modeControl?`: [`ModeControl`](../interfaces/ModeControl.md); \} |
| `options.modeControl?` | [`ModeControl`](../interfaces/ModeControl.md) |

## Returns

`object`

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `end()` | () => `void` | [core/session.ts:702](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L702) |
| `iterable` | `AsyncIterable`\<`SDKUserMessage`\> | [core/session.ts:703](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L703) |
| `push()` | (`text`, `delivery?`) => `void` | [core/session.ts:701](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L701) |
