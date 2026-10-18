# Function: createDeferred()

```ts
function createDeferred(): object;
```

Defined in: [core/session.ts:611](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L611)

Externally-controllable promise — used to know when a chat turn has finished.

## Returns

`object`

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `promise` | `Promise`\<`void`\> | [core/session.ts:611](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L611) |
| `resolve()` | () => `void` | [core/session.ts:611](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L611) |
