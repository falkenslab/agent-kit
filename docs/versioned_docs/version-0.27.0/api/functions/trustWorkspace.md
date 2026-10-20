# Function: trustWorkspace()

```ts
function trustWorkspace(dirs, names?): Promise<string[]>;
```

Defined in: [core/workspaceTrust.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/workspaceTrust.ts#L60)

Trusts a workspace's extensions (its project scope's, all or `names`) with the code its lock
has now: what the person does when the chat asks, or with `extension trust`. The names trusted.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `names?` | readonly `string`[] |

## Returns

`Promise`\<`string`[]\>
