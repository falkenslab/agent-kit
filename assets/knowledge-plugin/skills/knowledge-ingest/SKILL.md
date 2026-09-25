---
name: knowledge-ingest
description: Ingest one source into the knowledge base - a file in sources/, a document, a page - creating its summary page, creating or updating the concept and entity pages it touches, linking everything both ways, and updating index.md and log.md.
---

# Ingesting a source into the knowledge base

A source is ingested once, and from then on the knowledge base holds what it taught: later sessions read the pages, not the original again. Ingesting is not summarizing a file in isolation - its value is in how it connects to what the knowledge base already knows. Load the `knowledge-pages` skill first for the page templates.

## 1. Check it isn't already ingested

Look for it in `index.md` (Summaries) or `Grep` its file name or URL inside the knowledge base. If it already has a page:
- unchanged source: nothing to do;
- the source changed or the page is thin: update that page instead of creating another.

## 2. Read it for real

Read the whole source, not its first page. If it exists only outside the sources folder (a downloaded document, a remote file), save it with `save_to_sources` first, so the original is kept as obtained.

## 3. Write the summary page

Create `summaries/<slug>.md` with the template: summary, key points (literal wording where exactness matters), frontmatter `file`/`url` pointing to the original.

## 4. Update concepts and entities

For every concept or entity the source explains or relies on:
- no page yet: create it;
- page exists: add what is new (a better definition, an example, a nuance, a fact) with `Edit`, and link the summary under "Sources".

Check first whether it exists under another name (`Grep` the knowledge base for the term and look at `aliases`): a duplicate page is worse than none.

## 5. Link both ways and look for conflicts

Every link you added from page A to page B needs its counterpart in B. If the source contradicts an existing page, record both versions with attribution in both pages - don't overwrite.

## 6. Close

- `index.md`: new pages, and one-line descriptions that changed.
- `log.md`: `## [date] ingest | <source title>` with the pages created and updated.
- `overview.md`: only if the source changes the big picture.

When ingesting several sources in a row, do steps 1-5 for each and close once at the end.
