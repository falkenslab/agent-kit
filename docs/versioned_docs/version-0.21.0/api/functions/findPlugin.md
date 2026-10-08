# Function: findPlugin()

```ts
function findPlugin(dir, spec): Promise<{
  marketplace: KnownMarketplace;
  plugin: MarketplacePlugin;
}>;
```

Defined in: [core/marketplaces.ts:206](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L206)

A plugin found in the known marketplaces: `<name>@<marketplace>`, or a name only one of them offers.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |
| `spec` | `string` |

## Returns

`Promise`\<\{
  `marketplace`: [`KnownMarketplace`](../interfaces/KnownMarketplace.md);
  `plugin`: [`MarketplacePlugin`](../interfaces/MarketplacePlugin.md);
\}\>
