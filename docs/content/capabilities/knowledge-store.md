---
sidebar_position: 5
title: Knowledge store
description: The KnowledgeStore interface behind the knowledge_* tools - the kit's store over markdown files, and how to plug in your own (a database, a vector store).
---

# Knowledge store

The [knowledge base](knowledge-base.md)'s tools work on a `KnowledgeStore`, never on files. The kit ships one over markdown files; an agent can plug in another one (a database, a vector store) and the tools, the prompt and the skills stay the same.

## The kit's store

`createFileKnowledgeStore(knowledgeDir, { pageTypes? })` keeps pages as markdown files in the layout the knowledge base always had (see [On disk](knowledge-base.md#on-disk)). `buildSessionOptions()` creates it for you, with `spec.knowledgePageTypes`, and returns it as `knowledgeStore`, so a host can read the knowledge base too (to show it in a desktop app, say):

```ts
const { options, knowledgeStore } = await buildSessionOptions(config, runDir, spec);
const topics = (await knowledgeStore?.list())?.filter((page) => page.type === "topic");
```

It's usable on its own as well, in a script or a test:

```ts
import { createFileKnowledgeStore } from "@falkenslab/agent-kit";

const store = createFileKnowledgeStore("course/knowledge");
console.log(await store.index());
const report = await store.check();
```

## The interface

```ts
interface KnowledgeStore {
  types(): readonly PageType[];
  list(): Promise<PageInfo[]>; // every page but the retired ones
  read(id: string): Promise<KnowledgePage | null>; // with linkedFrom: the pages that link to it
  create(type: string, slug: string, title: string, content: string, fields?: FieldChanges): Promise<string>;
  createMany(pages: readonly NewPage[]): Promise<string[]>; // links among them allowed; all or none
  edit(id: string, oldText: string, newText: string, fields?: FieldChanges): Promise<void>;
  rewrite(id: string, content: string, fields?: FieldChanges): Promise<void>;
  supersede(id: string, by: string, reason?: string): Promise<void>;
  retire(id: string, reason: string): Promise<void>;
  search(query: string, limit?: number): Promise<SearchHit[]>;
  index(): Promise<string>; // the catalog, linked by id
  log(operation: string, what: string, pages?: readonly string[]): Promise<void>;
  recentLog?(limit?: number): Promise<string[]>; // optional: the latest log entries, newest first
  check(): Promise<CheckReport>;
  overview(): Promise<string>;
  writeOverview(content: string): Promise<void>;
}
```

What a store must keep, whatever it stores the pages in:

- **Ids are `type/slug`**, and links in content are `[text](type/slug)`: return them that way from `read()` and `index()`, whatever you keep internally (the kit's store writes file links in `index.md` on disk, but the tools get ids). `parseId()` and `linkedIds()` are exported to help.
- **Links must resolve**: `create`, `createMany`, `edit`, `rewrite` and `writeOverview` refuse a link to a page that doesn't exist, with a message the model can act on (the tools pass errors through as they are).
- **Pages are never deleted or renamed.** `supersede` and `retire` mark them (`fields.status`: `superseded` or `retired`); a retired page leaves `list()`, `index()` and `search()`, but `read()` still returns it.
- **`edit` replaces exactly one occurrence**, and fails if there's none or several.
- **`recentLog()`** is optional: without it, `knowledge_read("log")` says the store can't show its log.
- **`check()`** returns broken links, orphans and links to retired pages.
- **A summary's `ingested`** is the store's: set when it's created or rewritten, never taken from the caller. Its `file` is kept as given. A store knows nothing of the sources folder (see [Knowledge base and sources](knowledge-base.md#knowledge-base-and-sources)).

`BUILT_IN_PAGE_TYPES` are the kit's types (summary, concept, entity, synthesis, preference) with their templates; a store gets the agent's declared ones too, and should treat a page's type as a label, so it can hold any type.

## Plugging in your own

```ts
import type { AgentSpec, KnowledgeStore } from "@falkenslab/agent-kit";
import { createPgKnowledgeStore } from "./pgStore.js"; // yours

const spec: AgentSpec<Config> = {
  // …
  knowledgeStore: (config) => createPgKnowledgeStore(process.env.DATABASE_URL!, { pageTypes: myTypes }),
};
```

With `knowledgeStore`, the kit doesn't touch `knowledgeDir`'s files; it still needs `knowledgeDir` set, since that's what turns the knowledge base on (and keeps the file tools out of that folder).

A vector store usually keeps the curated pages as the source of truth and indexes them for `search()`: similarity search on embeddings of each page (or each section), with the same `SearchHit` result. Anthropic has no embeddings API; Voyage AI is the usual choice, and local options exist (LanceDB or sqlite-vec with a local model). `index()` and `check()` don't change.

## Wiring the tools yourself

A host that builds its own session options gets the same tools with `createKnowledgeServer(store, options)`:

```ts
import { createKnowledgeServer } from "@falkenslab/agent-kit";

mcpServers: {
  knowledge: createKnowledgeServer(store, { runDir, interactive: true }),
},
```

`interactive` adds `knowledge_retire`, which asks a person first; leave it off where there's nobody to ask. Name the server `knowledge`, so the plan gate, the step gate and the tool labels recognize its tools.
