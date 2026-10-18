# Function: updateMarketplace()

```ts
function updateMarketplace(dir, name): Promise<{
  commit?: string;
}>;
```

Defined in: [core/marketplaces.ts:187](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L187)

Takes a fresh copy of a known marketplace from where it came from.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |
| `name` | `string` |

## Returns

`Promise`\<\{
  `commit?`: `string`;
\}\>
