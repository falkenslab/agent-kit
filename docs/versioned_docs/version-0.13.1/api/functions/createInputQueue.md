# Function: createInputQueue()

```ts
function createInputQueue(): object;
```

Defined in: [core/session.ts:249](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L249)

User message queue backed by a single long-lived generator, for any multi-turn
(chat-shaped) caller of `query()`.

The SDK closes the transport as soon as the AsyncIterable passed as `prompt` (or to
`streamInput()`) finishes iterating — so a "one message and done" generator leaves the
transport closed right after sending that message, and the next call blows up with
"ProcessTransport is not ready for writing". A real multi-turn conversation needs a
single generator that never finishes on its own: messages get pushed into it with
`push()` and it's only explicitly closed with `end()` when leaving the chat.

## Returns

`object`

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `end()` | () => `void` | [core/session.ts:251](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L251) |
| `iterable` | `AsyncIterable`\<`SDKUserMessage`\> | [core/session.ts:252](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L252) |
| `push()` | (`text`) => `void` | [core/session.ts:250](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L250) |
