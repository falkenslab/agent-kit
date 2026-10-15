# Type Alias: FolderOption\<TConfig\>

```ts
type FolderOption<TConfig> = string | ((config) => string | undefined);
```

Defined in: [core/extensions.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L24)

A folder an extension's options name: a path, or one worked out from the session's config (its project).

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) | [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) |
