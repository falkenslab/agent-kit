# ADR-024: The knowledge base is reached only through the kit's tools, over a pluggable store

## Decision

With the built-in knowledge base on, the agent reaches `knowledgeDir` only through the kit's `knowledge_*` tools (an in-process MCP server), never through `Read`, `Write`, `Edit`, `Glob` or `Grep`. The tools work on pages (type and slug), not files, and sit on a public `KnowledgeStore` interface. Page types are the kit's four plus the ones the agent declares in its spec. The kit ships a store over markdown files with today's layout; other stores (a vector database, the kit's or a consumer's) can be plugged in without changing the tools, the prompt or the skills. The originals in `sourcesDir` stay files, read with `Read`.

## Motivation

- `knowledgeDir` may become a vector database. As long as the model and the skills use file tools and paths, the storage can't change without rewriting them; with tools as the only way in, it's a store swap.
- The wiki's rules (links both ways, an index of every page, never delete or rename, links that resolve) are kept by code, not by the prompt: guardrails live in code (ADR-003, ADR-007).
- The mechanical work leaves the model: no reading `index.md` to keep it, no `Grep` for backlinks, a lint in one call. Fewer turns, fewer tokens, less time.
- Rejected: keeping the file tools and enforcing the rules with hooks. It keeps the rules but saves nothing and stays tied to files.
- The kit's real consumers add their own page types (a course's topics and activities, ADR-008): with fixed types they would be left out of all of the above.
- Rejected: fitting an agent's types into the kit's four (a topic as an entity). Meaning is lost and every existing knowledge base would need migrating.
- Rejected: an agent with its own types staying on the file tools. It works, but the agents the kit exists for get none of the benefits.
- Rejected: a vector store alone. The curated pages, their links and syntheses are what makes the knowledge base useful; a vector index searches them, it doesn't replace them.

## Consequences

- The store keeps backlinks and the index itself (the file store computes backlinks and rewrites `index.md`); the operation log stays an explicit tool call, so its entries say what the operation was.
- Links must resolve, so pages that link to each other are created in one call (`createMany`, the tool's `also`): all or none.
- The tools take fields as a list of `{ name, value }` pairs: a `z.record()` in a tool's schema makes the SDK drop the whole server's tools (confirmed empirically).
- The file tools are kept out of `knowledgeDir` by the file scope gate (`toolOnlyDirs`), `Glob` included.
- Page edits are by fragment (`old` → `new`), as `Edit`, so a change costs little output whatever the store; a whole page can be rewritten when a better source redoes it. No version history: a knowledge base kept in git has its own.
- A page's identity (its slug) is never deleted or renamed, since links point to it; its content can change. Knowledge that was wrong is retired: out of the index and the search, kept and restorable, and only with the person's approval.
- Page types: the kit's (summary, concept, entity, synthesis, ADR-008; preference, #33) plus the agent's, declared in the spec with their folder (the root included), index section, template and a description of what they hold, which reaches the model through the prompt section and the tools' descriptions. The index lists the sections in the declared order, and a type can add frontmatter fields to its pages' index line (a concept's mastery). A store treats the type as a page label, so a vector store takes declared types as well.
- The `knowledge-*` skills and the prompt section speak of the tools, not of files or `index.md`.
- In plan mode the reading tools are allowed and the writing ones denied (ADR-023).
- It's the built-in knowledge base's only way in. An escape hatch back to the file tools (`knowledgeTools: "files"`, with its own plugin and prompt section) was kept for the transition and removed once nothing used it (#31): an agent that wants its own rules has `knowledgeBase: false`. Existing knowledge bases keep working: the file store uses the same layout.
- `KnowledgeStore` is public API from the start, so it has to stay stable across stores.
