# Function: extensionCatalog()

```ts
function extensionCatalog(dirs, options?): Promise<CatalogEntry[]>;
```

Defined in: [core/extensionCatalog.ts:106](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L106)

Everything the known marketplaces offer, matching `words` (in its name, description, category, tags or keywords) when given.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `options` | \{ `official?`: `string`; `topics?`: readonly `string`[]; `words?`: readonly `string`[]; \} |
| `options.official?` | `string` |
| `options.topics?` | readonly `string`[] |
| `options.words?` | readonly `string`[] |

## Returns

`Promise`\<[`CatalogEntry`](../interfaces/CatalogEntry.md)[]\>
