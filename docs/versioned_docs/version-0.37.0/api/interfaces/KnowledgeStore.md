# Interface: KnowledgeStore

Defined in: [extensions/knowledge/knowledgeStore.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L87)

Where the knowledge base lives. The kit ships one over markdown files
(`createFileKnowledgeStore()`); another one (a database, a vector store) implements this
interface and is passed with `AgentSpec.knowledgeStore`. Pages are never deleted or renamed:
their ids are what links point to.

## Methods

### check()

```ts
check(): Promise<CheckReport>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:121](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L121)

The mechanical problems.

#### Returns

`Promise`\<[`CheckReport`](CheckReport.md)\>

***

### create()

```ts
create(
   type, 
   slug, 
   title, 
   content, 
   fields?
): Promise<string>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L95)

A new page; fails if the id exists or a link points nowhere. Returns its id.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `slug` | `string` |
| `title` | `string` |
| `content` | `string` |
| `fields?` | [`FieldChanges`](../type-aliases/FieldChanges.md) |

#### Returns

`Promise`\<`string`\>

***

### createMany()

```ts
createMany(pages): Promise<string[]>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:100](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L100)

Several new pages at once, whose links may point to each other (a summary and the
concepts it feeds): all are created, or none. Returns their ids.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `pages` | readonly [`NewPage`](NewPage.md)[] |

#### Returns

`Promise`\<`string`[]\>

***

### edit()

```ts
edit(
   id, 
   oldText, 
   newText, 
   fields?
): Promise<void>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:102](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L102)

Replaces the one occurrence of `oldText` in a page's body; fails if it's missing or appears more than once.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `oldText` | `string` |
| `newText` | `string` |
| `fields?` | [`FieldChanges`](../type-aliases/FieldChanges.md) |

#### Returns

`Promise`\<`void`\>

***

### index()

```ts
index(): Promise<string>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:112](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L112)

The catalog: every active or superseded page, one line each, by section, linked by id (`concept/bowline`), as everything the model reads.

#### Returns

`Promise`\<`string`\>

***

### list()

```ts
list(): Promise<PageInfo[]>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L91)

Every page but the retired ones.

#### Returns

`Promise`\<[`PageInfo`](PageInfo.md)[]\>

***

### log()

```ts
log(
   operation, 
   what, 
   pages?
): Promise<void>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:114](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L114)

Adds an entry to the operation log, dated today.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `operation` | `string` |
| `what` | `string` |
| `pages?` | readonly `string`[] |

#### Returns

`Promise`\<`void`\>

***

### overview()

```ts
overview(): Promise<string>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:123](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L123)

The overview: a living synthesis of the whole knowledge base ("" if none yet).

#### Returns

`Promise`\<`string`\>

***

### read()

```ts
read(id): Promise<KnowledgePage | null>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L93)

A page, retired ones included; `null` if there's none.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`Promise`\<[`KnowledgePage`](KnowledgePage.md) \| `null`\>

***

### recentLog()?

```ts
optional recentLog(limit?): Promise<string[]>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L119)

The latest entries of the operation log, newest first, as markdown (e.g. "## [2026-10-04]
ingest | …"). Optional: a store without it can't show the log to the agent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `limit?` | `number` |

#### Returns

`Promise`\<`string`[]\>

***

### retire()

```ts
retire(id, reason): Promise<void>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:108](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L108)

Takes a page out of the index and the search (it's kept, and can be restored).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `reason` | `string` |

#### Returns

`Promise`\<`void`\>

***

### rewrite()

```ts
rewrite(
   id, 
   content, 
   fields?
): Promise<void>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L104)

Replaces a page's whole body, keeping its id.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `content` | `string` |
| `fields?` | [`FieldChanges`](../type-aliases/FieldChanges.md) |

#### Returns

`Promise`\<`void`\>

***

### search()

```ts
search(query, limit?): Promise<SearchHit[]>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:110](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L110)

Pages matching words of `query` in their title, aliases or body, best first.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | `string` |
| `limit?` | `number` |

#### Returns

`Promise`\<[`SearchHit`](SearchHit.md)[]\>

***

### supersede()

```ts
supersede(
   id, 
   by, 
   reason?
): Promise<void>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:106](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L106)

Marks a page superseded by another, with a notice at its top.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `by` | `string` |
| `reason?` | `string` |

#### Returns

`Promise`\<`void`\>

***

### types()

```ts
types(): readonly PageType[];
```

Defined in: [extensions/knowledge/knowledgeStore.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L89)

The page types it holds, the kit's and the agent's.

#### Returns

readonly [`PageType`](PageType.md)[]

***

### writeOverview()

```ts
writeOverview(content): Promise<void>;
```

Defined in: [extensions/knowledge/knowledgeStore.ts:125](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/knowledge/knowledgeStore.ts#L125)

Replaces the overview.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `content` | `string` |

#### Returns

`Promise`\<`void`\>
