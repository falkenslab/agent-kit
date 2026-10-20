# Function: inspectMarketplace()

```ts
function inspectMarketplace(source): Promise<MarketplaceManifest>;
```

Defined in: [core/marketplaces.ts:141](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L141)

Reads a marketplace from a folder, a git URL (`#ref`) or `owner/repo` without adding it: what to show before asking.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |

## Returns

`Promise`\<[`MarketplaceManifest`](../interfaces/MarketplaceManifest.md)\>
