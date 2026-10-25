# Function: scopePrivateDir()

```ts
function scopePrivateDir(dirs, scope): string | undefined;
```

Defined in: [core/externalExtensions.ts:220](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L220)

Where a scope keeps what's the person's, not the workspace's: its extensions' data and secrets
(#57). The agent's scope, its own folder; a project's, a folder of its own in the agent's
(`<agent scope>/.projects/<project>-<hash>/`), so nothing private travels with a project. An
agent without a scope of its own keeps it in the project's.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `scope` | keyof [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |

## Returns

`string` \| `undefined`
