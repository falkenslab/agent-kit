# Function: installExtension()

```ts
function installExtension(
   dirs, 
   spec, 
   options?
): Promise<{
  commit?: string;
  marketplace: string;
  missing: string[];
  name: string;
  replaced: boolean;
  scope: keyof ExtensionDirs;
}>;
```

Defined in: [core/extensionCatalog.ts:166](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L166)

Installs a plugin of a known marketplace (`<name>@<marketplace>`, or a name only one offers)
into a scope: the agent's by default (the project's when it has none), the packages its npx
servers run into the agent's cache. Asking the person first, for one that isn't the agent's
own (`needsConfirmation()`), is the caller's.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `spec` | `string` |
| `options` | \{ `official?`: `string`; `scope?`: keyof ExtensionDirs; \} |
| `options.official?` | `string` |
| `options.scope?` | keyof ExtensionDirs |

## Returns

`Promise`\<\{
  `commit?`: `string`;
  `marketplace`: `string`;
  `missing`: `string`[];
  `name`: `string`;
  `replaced`: `boolean`;
  `scope`: keyof [`ExtensionDirs`](../interfaces/ExtensionDirs.md);
\}\>
