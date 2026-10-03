# Knowledge base through the kit's own tools

Issue: [#13](https://github.com/falkenslab/agent-kit/issues/13)

## Goal

The agent reaches the built-in knowledge base only through `knowledge_*` tools over a pluggable `KnowledgeStore` (ADR-024), with a store over markdown files in the kit.

## Context

- Today the knowledge base is the prompt section and the `knowledge-*` skills (ADR-008) plus the generic file tools (`Read`, `Write`, `Edit`, `Glob`, `Grep`), scoped by the file scope gate. The model keeps the wiki's rules itself: reads `index.md` first, adds backlinks with `Grep` and `Edit`, updates the index and `log.md`, runs the lint with many `Glob`/`Grep` calls.
- `knowledgeDir` may become a vector database: the model and the skills must stop depending on files and paths.
- Originals (`sourcesDir`) stay files, managed by their own tools (`source-tools`, #14).

## Changes

- Page types declared in the spec (e.g. `knowledgePageTypes: [{ type: "topic", dir: "topics", indexSection: "Topics", template }]`) on top of the kit's four: folder (the root included), index section and its order, template, frontmatter fields shown in the index line, and a one-line description (what the type holds, when to create one) that the prompt section and `knowledge_create`'s description list, so the agent's own rules don't need file paths.
- `KnowledgeStore` (public, `src/core/`): pages by type (the kit's and the declared ones) and slug; create, read, edit by fragment, rewrite, supersede, retire, search, list, backlinks, index, log. `createFileKnowledgeStore(knowledgeDir)` over today's layout (`index.md`, `log.md`, `overview.md`, `summaries/`...).
- An in-process MCP server, `knowledge`:
  - `knowledge_index()`: the generated catalog, by section in the declared order;
  - `knowledge_search(query)`: pages matching titles, aliases and content, with snippets (keywords for the file store);
  - `knowledge_read(page)`: the page and what links to it;
  - `knowledge_create(type, slug, title, content)`: the type's template and frontmatter, unique slug, links that resolve, index updated; a summary records its original's hash (#14);
  - `knowledge_edit(page, old, new)`: one fragment; links checked, backlinks and index kept;
  - `knowledge_rewrite(page, content)`: replaces a page's whole content (a summary redone from a better source), keeping its slug, the links to it and its index entry; no version history (git, if the knowledge base is versioned);
  - `knowledge_supersede(page, by)`: marks a page superseded by another, never deletes or renames;
  - `knowledge_retire(page, reason)`: for knowledge that was wrong (learned from a wrong original): the page leaves the index and the search but is kept and can be restored; always asks the person first (approval panel), so it isn't offered in autonomous mode, and the plan gate denies it;
  - `knowledge_log(operation, what)`: an entry in the log with the real date;
  - `knowledge_check()`: broken links, orphans, pages missing from the index, the originals `list_sources` (#14) reports new, changed or missing, and the pages that cite a retired original or link to a retired page, with the exact passages that cite it, so the agent can correct or re-ground them.
- `buildSessionOptions()`: with the built-in knowledge base, the `knowledge` server instead of file tools on `knowledgeDir`; `Read` only on `sourcesDir`. A spec option to keep the file tools, and one to pass another store. Agents with `knowledgeBase: false` or `extraWritableDirs` keep the file tools for those folders.
- Plan gate: the reading tools allowed, the writing ones denied.
- Rewrite the prompt section and the `knowledge-*` skills in terms of the tools; `knowledge-ingest` gets a procedure to replace an original: after a wrong one, correct or remove what it taught; after a better one, ingest it and re-ground the passages that cited the old one.
- Labels and phrases for the new tools in the four languages.
- Docs: the knowledge base guide rewritten, `KnowledgeStore` with an example store, session options, security (file scope), plan mode; `architecture.md` and the glossary.

## Acceptance

- With `knowledgeDir`, the session has the `knowledge_*` tools and no `Write`, `Edit`, `Glob` or `Grep` on it; `Read` reaches `sourcesDir` but not `knowledgeDir`.
- An existing knowledge base is read and extended by the file store without changes.
- A sample knowledge base with declared types (pages at the root, a type with its own folder, a frontmatter field in the index line) is read and extended through the tools, in a test here. Before closing, padawan's `smoke-ingest` is run by hand against a real course knowledge base with padawan's declared types, and its result reported in the issue.
- Creating or editing a page that links to another records the backlink; a link to a missing page is refused with the reason; no tool deletes or renames a page. A rewritten page keeps its slug and the links to it; a retired page is asked for first, leaves the index and the search, and can be restored.
- `knowledge_check()` finds the mechanical problems in one call.
- Baseline and result: tokens, seconds and tool calls of an ingest and a lint on a sample knowledge base of ~30 pages, measured before and after, reported in the issue.
- Tests for the file store, every tool, the session wiring and the plan gate; captain-whiskers still typechecks; `verify` passes.
