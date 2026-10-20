# Function: extensionCatalog()

```ts
function extensionCatalog(dirs, options?): Promise<CatalogEntry[]>;
```

Defined in: [core/extensionCatalog.ts:125](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L125)

Everything the known marketplaces offer, matching `words` (in its name, description, category, tags or keywords) when given; its texts in `language` (the kit's by default).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `options` | \{ `language?`: [`Language`](../type-aliases/Language.md); `official?`: `string`; `topics?`: readonly `string`[]; `words?`: readonly `string`[]; \} |
| `options.language?` | [`Language`](../type-aliases/Language.md) |
| `options.official?` | `string` |
| `options.topics?` | readonly `string`[] |
| `options.words?` | readonly `string`[] |

## Returns

`Promise`\<[`CatalogEntry`](../interfaces/CatalogEntry.md)[]\>
