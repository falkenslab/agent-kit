# Function: parseId()

```ts
function parseId(id): 
  | {
  slug: string;
  type: string;
}
  | null;
```

Defined in: [core/knowledgeStore.ts:201](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L201)

`type/slug` split, or null when it isn't one.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

## Returns

  \| \{
  `slug`: `string`;
  `type`: `string`;
\}
  \| `null`
