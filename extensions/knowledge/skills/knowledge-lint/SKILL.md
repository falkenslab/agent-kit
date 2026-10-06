---
name: knowledge-lint
description: Health-check the knowledge base - broken links, orphan pages, links to retired pages, summaries behind their originals, duplicated concepts, mentioned-but-missing concepts, contradictions, gaps - fix what's mechanical and report the rest.
---

# Linting the knowledge base

A knowledge base maintained across sessions drifts. Lint it when asked and after a large ingest.

## 1. The mechanical checks, in one call

`knowledge_check` returns broken links, orphan pages and links to retired pages. The index and backlinks are kept by the store: there's nothing to fix there.

- **Broken links**: fix them with `knowledge_edit` when the right target is obvious (a typo, a page under a close name: `knowledge_search`); otherwise report them.
- **Orphans**: link them from the pages where they belong, or report why they don't belong anywhere.
- **Links to retired pages**: correct or re-ground them.

## 2. The knowledge base against its originals

When there's a sources folder, match `list_sources` with `knowledge_index`:

- **Not ingested**: present originals no summary is about. Report them as what to ingest next (or do it, if asked).
- **Behind**: summaries whose original's `changedAt` is after their `ingested`, (ISO 8601 in UTC: the later one sorts after as text). Report them as what to update.
- **Retired or missing originals**: summaries still active whose original is retired (`knowledge_retire` them if it was wrong, which asks the person itself, or `knowledge_supersede` them if it was replaced) or missing (report them); and the passages that cite them (`knowledge_search` the file name).

## 3. The checks that need judgement

Use `knowledge_index` and `knowledge_search`; read only the pages a check needs.

- **Duplicates**: two pages for the same idea under different names. Merge the content into one with `knowledge_edit`, `knowledge_supersede` the other (never delete it) and repoint links.
- **Missing pages**: terms that several pages treat as concepts or entities but have no page. Create them if the material is there; otherwise list them.
- **Contradictions**: claims that disagree across pages without being recorded as such. Record both sides, attributed.
- **Provenance**: claims with no traceable source. Add the link, or mark them as unsourced.

## Close

`knowledge_log` with operation `lint` and what was fixed. Then report to the person: what you fixed, and what needs their decision or more material. Don't make judgement calls silently: merging pages that are only similar, or choosing between contradictory sources, goes in the report.
