# Function: runQuery()

```ts
function runQuery(prompt, options): AgentRun;
```

Defined in: [core/runner.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L124)

Thin wrapper around the SDK's own `query()`: same two-argument shape (a plain string
for a one-shot run, or an `AsyncIterable<SDKUserMessage>` — see `createInputQueue()` —
for a multi-turn chat), translating its raw message stream into `AgentEvent`s as
described above. Every other control surface of the underlying `Query` (`interrupt`,
`close`, `supportedCommands`) is passed through unchanged.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | `string` \| `AsyncIterable`\<`SDKUserMessage`, `any`, `any`\> |
| `options` | `Options` |

## Returns

[`AgentRun`](../interfaces/AgentRun.md)
