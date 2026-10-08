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

Defined in: [core/externalExtensions.ts:394](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L394)

Installs an extension into a scope from a folder or a git repository (`url#ref`, `sha` to pin
a commit, and `subdir` for one inside it): copies its files (never runs a script), checks its
manifest, and locks it, enabled, with the marketplace it came from when it did (`origin`, for a
temporary folder, is what the lock says it came from). An extension with the same name in that
scope is replaced.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |
| `scopeDir` | `string` |
| `options` | \{ `marketplace?`: `string`; `origin?`: `string`; `sha?`: `string`; `subdir?`: `string`; \} |
| `options.marketplace?` | `string` |
| `options.origin?` | `string` |
| `options.sha?` | `string` |
| `options.subdir?` | `string` |

## Returns

`Promise`\<\{
  `commit?`: `string`;
  `name`: `string`;
  `replaced`: `boolean`;
\}\>
