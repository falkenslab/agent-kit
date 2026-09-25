---
name: vault-lint
description: Health-check the knowledge vault - broken links, pages missing from index.md, orphan pages, one-way links, duplicated concepts, mentioned-but-missing concepts, contradictions, gaps - fix what's mechanical and report the rest.
---

# Linting the knowledge vault

A vault maintained across sessions drifts: links break, pages go unlisted, the same concept appears under two names. Lint it when asked and after a large ingest. Load `vault-pages` first for the templates.

## Checks

Use `Glob` to list pages and `Grep` (always with `path` inside the vault) to find links, instead of reading every page in full.

1. **Broken links**: a relative link whose target file doesn't exist. Fix it if the right target is obvious (a typo, a page under a close name); otherwise report it.
2. **Index**: every page is listed in `index.md` and every entry there points to an existing page. Fix it.
3. **Orphans**: pages nothing links to (`Grep` for the file name). Link them from where they belong, or report why they don't belong anywhere.
4. **One-way links**: a summary that feeds a concept which doesn't list it back... Add the missing side.
5. **Duplicates**: two pages for the same idea under different names. Merge the content into one, mark the other as superseded (never delete it) and repoint links.
6. **Missing pages**: terms that several pages treat as concepts or entities but have no page. Create them if the material is there; otherwise list them.
7. **Contradictions**: claims that disagree across pages without being recorded as such. Record both sides, attributed.
8. **Provenance**: claims with no traceable source. Add the link, or mark them as unsourced.
9. **Gaps**: files in the sources folder with no summary page yet, concepts mentioned but never explained by any source. Report them - they are what to ingest or find next.

## Close

Append `## [date] lint | <summary>` to `log.md` listing what was fixed. Then report to the human: what you fixed, and what needs their decision or more material. Don't make judgement calls silently - merging pages that are only similar, or choosing between contradictory sources, goes in the report.
