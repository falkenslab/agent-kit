# The sources tools read the knowledge base's files, bypassing its store

Issue: [#30](https://github.com/falkenslab/agent-kit/issues/30)

## Problem

With a `KnowledgeStore` that doesn't keep pages as the kit's markdown files (`AgentSpec.knowledgeStore`: a database, a vector store), the ingest status is wrong:

- `list_sources` reports every original as `new`, even the ingested ones, and lists no summaries.
- `retire_source` moves the original out but doesn't retire or supersede its summary pages.
- `knowledge_check`'s new and changed originals are wrong the same way (it calls `listSources`).
- A summary's ingest hash may be recorded against the wrong path.

With the kit's own file store everything works, which is why nothing caught it.

## Cause

Each side reaches into the other's data:

- `sources.ts` reads the knowledge base's files: `summariesByOriginal()` parses `knowledgeDir/summaries/*.md`; `retireSource()` edits them (`markPage()`). Both bypass the store (ADR-024).
- The knowledge tools write into the sources' data: `recordIngest()` stores the ingest hash (`ingestedHash`) in the sources manifest, and `ingested()` resolves a summary's `file` the way the file store keeps it on disk.

## Solution

**Each extension owns its data, and the model connects them when it sees fit.** Neither reads nor writes the other's data, in code or on disk; nothing is shared but what the model carries between their tools, and the model only carries short identifiers (an original's path, a page id) and dates, never data that must be exact (hashes). This is also the shape of the sources and knowledge base extensions (#29), in process or out of it.

- **The sources side owns the originals.** It knows which there are, their type, size and pages, and **when each last changed**: it computes their hashes itself when listing, and records the date the hash changed (`changedAt`, next to `addedAt`). Hashes never leave it. `list_sources` returns each original with `changedAt` and `present`, `missing` or retired; no `new`/`ingested`/`changed`, no summaries.
- **The knowledge side owns its pages.** A summary records which original it's about (`file`, the path relative to the sources folder, as given) and **when it was written** (`ingested`, a timestamp the store sets itself when the summary is created or rewritten from its original). The summaries' index line shows both, so one `knowledge_index` and one `list_sources` give the model everything to match.
- **The model connects them**, as the skills tell it:
  - to ingest: `list_sources` and `knowledge_index`; an original with no summary, or whose `changedAt` is after its summary's `ingested`, needs (re)ingesting; the comparison is `date_math`'s, not the model's by eye, one original at a time;
  - to retire: `retire_source`, then `knowledge_retire` (wrong) or `knowledge_supersede` (replaced) for its summaries, each with the person's approval. `retire_source`'s answer reminds it ("if anything was built from it, review it").
  - Both tools return dates in the same format (ISO 8601 with the time), so carrying them is near-literal.
- **The sources' prompt section is theirs.** The "originals" line moves out of the knowledge base's section (`knowledge.ts`'s `originalsLine()`) into its own, added whenever `sourcesDir` is set, with or without a knowledge base (today an agent with sources and no knowledge base gets no prompt about them).
- Removed: `summariesByOriginal()`, `markPage()`, `recordIngest()` and `ingestedHash` from `sources.ts`; the sources part of `knowledge_check` (new, changed and missing originals, passages citing a retired original) and the knowledge tools' `sourcesDir`/`knowledgeDir` options; the file store's check that `file` is a real original. `knowledge_check` keeps what is its own: broken links, orphans, links to retired pages.
- Updated: the ingest and lint skills and the ingest command (how to match originals and summaries, with `date_math`), the prompt sections, Captain Whiskers' `learn` and `logbook-check` commands and his test script, the docs (`capabilities/knowledge-base.md`, the sources tools' pages).
- Accepted trade-off: the kit no longer guarantees that a summary's `file` exists, nor marks summaries when an original is retired; the model does it, and a lint finds what it missed. `list_sources`' output changes (statuses): a breaking change for agents that read it, noted in the release.
- Migration: manifests keep `ingestedHash` harmlessly (ignored); existing summaries without `ingested` get it from their page's `updated`/creation date on first read.

## Verification

- The sources tools' tests run with no knowledge base at all; `sources.ts` imports nothing from the knowledge side, and the knowledge side nothing from `sources.ts`.
- `changedAt` moves when an original's content changes, not when it's only touched.
- With an in-memory `KnowledgeStore` and with the file store alike: creating a summary sets `ingested`; the index line shows `file` and `ingested`.
- A real session with Captain Whiskers: `/captain-whiskers:learn` ingests the new originals; after replacing one, a second `learn` re-ingests only that one (it compared with `date_math`); retiring an original as wrong ends with its summary retired, after approval.
