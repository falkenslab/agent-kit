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

Defined in: [core/externalExtensions.ts:371](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L371)

Installs an extension into a scope from a folder or a git repository (`url#ref`, and `subdir`
for one inside it): copies its files (never runs a script), checks its manifest, and locks it,
enabled. An extension with the same name in that scope is replaced.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |
| `scopeDir` | `string` |
| `options` | \{ `subdir?`: `string`; \} |
| `options.subdir?` | `string` |

## Returns

`Promise`\<\{
  `commit?`: `string`;
  `name`: `string`;
  `replaced`: `boolean`;
\}\>
