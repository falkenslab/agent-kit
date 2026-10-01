# Function: createInputQueue()

```ts
function createInputQueue(options?): object;
```

Defined in: [core/session.ts:314](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L314)

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

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `modeControl?`: [`ModeControl`](../interfaces/ModeControl.md); \} |
| `options.modeControl?` | [`ModeControl`](../interfaces/ModeControl.md) |

## Returns

`object`

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `end()` | () => `void` | [core/session.ts:316](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L316) |
| `iterable` | `AsyncIterable`\<`SDKUserMessage`\> | [core/session.ts:317](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L317) |
| `push()` | (`text`) => `void` | [core/session.ts:315](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L315) |
