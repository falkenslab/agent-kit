# Function: installFromMarketplace()

```ts
function installFromMarketplace(
   dir, 
   spec, 
   scopeDir, 
   options?
): Promise<{
  commit?: string;
  marketplace: string;
  name: string;
  replaced: boolean;
}>;
```

Defined in: [core/marketplaces.ts:266](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L266)

Installs `<plugin>@<marketplace>` (or a plugin only one known marketplace offers) into a scope,
locked with where it came from (the packages its npx servers run into `options.packages`, #54).
Its name in the agent is its `plugin.json`'s, as for any extension.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |
| `spec` | `string` |
| `scopeDir` | `string` |
| `options` | \{ `packages?`: `string`; `store?`: `string`; \} |
| `options.packages?` | `string` |
| `options.store?` | `string` |

## Returns

`Promise`\<\{
  `commit?`: `string`;
  `marketplace`: `string`;
  `name`: `string`;
  `replaced`: `boolean`;
\}\>
