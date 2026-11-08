# Function: resolvePluginSource()

```ts
function resolvePluginSource(marketplace, plugin): ResolvedSource;
```

Defined in: [core/marketplaces.ts:220](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L220)

Where a plugin's source points: a folder of the marketplace's copy, a git repository, an npm package or a zip.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `marketplace` | [`KnownMarketplace`](../interfaces/KnownMarketplace.md) |
| `plugin` | [`MarketplacePlugin`](../interfaces/MarketplacePlugin.md) |

## Returns

`ResolvedSource`
