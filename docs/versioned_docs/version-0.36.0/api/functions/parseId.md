# Function: parseId()

```ts
function parseId(id): 
  | {
  slug: string;
  type: string;
}
  | null;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:214](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L214)

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
