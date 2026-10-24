# Function: addMarketplace()

```ts
function addMarketplace(
   source, 
   dir, 
   options?
): Promise<{
  commit?: string;
  manifest: MarketplaceManifest;
  name: string;
  replaced: boolean;
}>;
```

Defined in: [core/marketplaces.ts:155](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L155)

Adds a marketplace to the agent (its extensions folder, `dir`) from a folder, a git URL
(`#ref`) or `owner/repo`, taking a copy; one with the same name is replaced. Asking the person
first is the caller's: the kit's command asks them to type its name, unless it's `official`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |
| `dir` | `string` |
| `options` | \{ `official?`: `boolean`; \} |
| `options.official?` | `boolean` |

## Returns

`Promise`\<\{
  `commit?`: `string`;
  `manifest`: [`MarketplaceManifest`](../interfaces/MarketplaceManifest.md);
  `name`: `string`;
  `replaced`: `boolean`;
\}\>
