# Interface: KnowledgeStore

Defined in: [core/knowledgeStore.ts:88](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L88)

Where the knowledge base lives. The kit ships one over markdown files
(`createFileKnowledgeStore()`); another one (a database, a vector store) implements this
interface and is passed with `AgentSpec.knowledgeStore`. Pages are never deleted or renamed:
their ids are what links point to.

## Methods

### check()

```ts
check(): Promise<CheckReport>;
```

Defined in: [core/knowledgeStore.ts:117](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L117)

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

Defined in: [core/knowledgeStore.ts:96](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L96)

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

Defined in: [core/knowledgeStore.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L101)

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

Defined in: [core/knowledgeStore.ts:103](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L103)

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

Defined in: [core/knowledgeStore.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L113)

The catalog: every active or superseded page, one line each, by section.

#### Returns

`Promise`\<`string`\>

***

### list()

```ts
list(): Promise<PageInfo[]>;
```

Defined in: [core/knowledgeStore.ts:92](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L92)

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

Defined in: [core/knowledgeStore.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L115)

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

Defined in: [core/knowledgeStore.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L119)

The overview: a living synthesis of the whole knowledge base ("" if none yet).

#### Returns

`Promise`\<`string`\>

***

### read()

```ts
read(id): Promise<KnowledgePage | null>;
```

Defined in: [core/knowledgeStore.ts:94](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L94)

A page, retired ones included; `null` if there's none.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`Promise`\<[`KnowledgePage`](KnowledgePage.md) \| `null`\>

***

### retire()

```ts
retire(id, reason): Promise<void>;
```

Defined in: [core/knowledgeStore.ts:109](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L109)

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

Defined in: [core/knowledgeStore.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L105)

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

Defined in: [core/knowledgeStore.ts:111](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L111)

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

Defined in: [core/knowledgeStore.ts:107](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L107)

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

Defined in: [core/knowledgeStore.ts:90](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L90)

The page types it holds, the kit's and the agent's.

#### Returns

readonly [`PageType`](PageType.md)[]

***

### writeOverview()

```ts
writeOverview(content): Promise<void>;
```

Defined in: [core/knowledgeStore.ts:121](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledgeStore.ts#L121)

Replaces the overview.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `content` | `string` |

#### Returns

`Promise`\<`void`\>
