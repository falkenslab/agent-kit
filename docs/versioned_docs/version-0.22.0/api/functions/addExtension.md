# Function: addExtension()

```ts
function addExtension(
   source, 
   scopeDir, 
   options?
): Promise<{
  commit?: string;
  name: string;
  replaced: boolean;
}>;
```

Defined in: [core/externalExtensions.ts:593](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L593)

Installs an extension into a scope from a folder or a git repository (`url#ref`, `sha` to pin
a commit, and `subdir` for one inside it): copies its files (never runs a script), checks its
manifest, and locks it, enabled, with the marketplace it came from when it did (`origin`, for a
temporary folder, is what the lock says it came from). An extension with the same name in that
scope is replaced; its data folder stays. With `link`, a folder is registered where it is
instead, to develop it: not copied, and its files not checked. The packages its npx servers
run are fetched into `packages` (#54), the agent's package cache (`packageCacheDir()`; by
default the scope's).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |
| `scopeDir` | `string` |
| `options` | \{ `link?`: `boolean`; `marketplace?`: `string`; `origin?`: `string`; `packages?`: `string`; `sha?`: `string`; `store?`: `string`; `subdir?`: `string`; \} |
| `options.link?` | `boolean` |
| `options.marketplace?` | `string` |
| `options.origin?` | `string` |
| `options.packages?` | `string` |
| `options.sha?` | `string` |
| `options.store?` | `string` |
| `options.subdir?` | `string` |

## Returns

`Promise`\<\{
  `commit?`: `string`;
  `name`: `string`;
  `replaced`: `boolean`;
\}\>
