# Function: packageCacheDir()

```ts
function packageCacheDir(dirs): string | undefined;
```

Defined in: [core/npxPackages.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/npxPackages.ts#L59)

Where an agent keeps the packages its extensions' npx servers run: in its scope (the project's when it has none), shared by both.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |

## Returns

`string` \| `undefined`
