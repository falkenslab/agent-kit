# Function: installFromMarketplace()

```ts
function installFromMarketplace(
   dir, 
   spec, 
   scopeDir
): Promise<{
  commit?: string;
  marketplace: string;
  name: string;
  replaced: boolean;
}>;
```

Defined in: [core/marketplaces.ts:265](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L265)

Installs `<plugin>@<marketplace>` (or a plugin only one known marketplace offers) into a scope,
locked with where it came from. Its name in the agent is its `plugin.json`'s, as for any extension.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |
| `spec` | `string` |
| `scopeDir` | `string` |

## Returns

`Promise`\<\{
  `commit?`: `string`;
  `marketplace`: `string`;
  `name`: `string`;
  `replaced`: `boolean`;
\}\>
