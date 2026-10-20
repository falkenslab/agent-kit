# Function: removeMarketplace()

```ts
function removeMarketplace(dir, name): Promise<boolean>;
```

Defined in: [core/marketplaces.ts:196](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L196)

Forgets a marketplace (its copy and its entry); the extensions installed from it stay. False when it wasn't known.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |
| `name` | `string` |

## Returns

`Promise`\<`boolean`\>
