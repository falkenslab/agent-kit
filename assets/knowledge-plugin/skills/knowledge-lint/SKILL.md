---
name: knowledge-lint
description: Health-check the knowledge base - broken links, orphan pages, links to retired pages, missing or changed originals, duplicated concepts, mentioned-but-missing concepts, contradictions, gaps - fix what's mechanical and report the rest.
---

# Linting the knowledge base

A knowledge base maintained across sessions drifts. Lint it when asked and after a large ingest.

## 1. The mechanical checks, in one call

`knowledge_check` returns broken links, orphan pages, links to retired pages, summaries whose original is gone, originals that are new, changed or missing, and the passages that cite a retired original. The index and backlinks are kept by the store: there's nothing to fix there.

- **Broken links**: fix them with `knowledge_edit` when the right target is obvious (a typo, a page under a close name: `knowledge_search`); otherwise report them.
- **Orphans**: link them from the pages where they belong, or report why they don't belong anywhere.
- **Links to retired pages, passages citing a retired original**: correct or re-ground them.
- **New or changed originals**: report them as what to ingest or update next (or do it, if asked).

## 2. The checks that need judgement

Use `knowledge_index` and `knowledge_search`; read only the pages a check needs.

- **Duplicates**: two pages for the same idea under different names. Merge the content into one with `knowledge_edit`, `knowledge_supersede` the other (never delete it) and repoint links.
- **Missing pages**: terms that several pages treat as concepts or entities but have no page. Create them if the material is there; otherwise list them.
- **Contradictions**: claims that disagree across pages without being recorded as such. Record both sides, attributed.
- **Provenance**: claims with no traceable source. Add the link, or mark them as unsourced.

## Close

`knowledge_log` with operation `lint` and what was fixed. Then report to the person: what you fixed, and what needs their decision or more material. Don't make judgement calls silently: merging pages that are only similar, or choosing between contradictory sources, goes in the report.
