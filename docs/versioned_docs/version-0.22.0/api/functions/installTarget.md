# Function: installTarget()

```ts
function installTarget(dirs, scope): object;
```

Defined in: [core/externalExtensions.ts:174](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L174)

How an install into `scope` is done: its npx packages into the agent's cache, and a project's
code into the agent's store when the agent has a scope of its own.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `scope` | keyof [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |

## Returns

`object`

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `packages?` | `string` | [core/externalExtensions.ts:174](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L174) |
| `store?` | `string` | [core/externalExtensions.ts:174](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L174) |
