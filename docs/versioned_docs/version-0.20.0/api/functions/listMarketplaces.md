# Function: listMarketplaces()

```ts
function listMarketplaces(dir): Promise<KnownMarketplace[]>;
```

Defined in: [core/marketplaces.ts:175](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L175)

The marketplaces the agent knows, with their manifests when they can be read.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |

## Returns

`Promise`\<[`KnownMarketplace`](../interfaces/KnownMarketplace.md)[]\>
