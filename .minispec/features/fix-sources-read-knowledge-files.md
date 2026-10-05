# The sources tools read the knowledge base's files, bypassing its store

Issue: [#30](https://github.com/falkenslab/agent-kit/issues/30)

## Problem

With a `KnowledgeStore` that doesn't keep pages as the kit's markdown files (`AgentSpec.knowledgeStore`: a database, a vector store), the sources tools and the knowledge tools get the ingest status wrong:

- `list_sources` reports every original as `new`, even the ingested ones, and lists no summaries for them.
- `retire_source` moves the original out but doesn't retire or supersede its summary pages.
- `knowledge_check`'s new and changed originals are wrong the same way (it calls `listSources`).
- A summary's ingest hash may be recorded against the wrong path.

With the kit's own file store everything works, which is why nothing caught it.

## Cause

The sources side knows the knowledge base by its file layout, not by its interface (ADR-024: the knowledge base is reached only through the `knowledge_*` tools over a `KnowledgeStore`):

- `sources.ts`'s `summariesByOriginal()` reads `knowledgeDir/summaries/*.md` and parses the `file:` frontmatter, as stored on disk (a link relative to the page); `listSources()` and `retireSource()` use it.
- `retireSource()` edits those summary files directly (`markPage()`), instead of `store.retire()`/`store.supersede()`.
- `knowledgeTools.ts`'s `ingested()` resolves a summary's `file` relative to `knowledgeDir/summaries/`, the file store's on-disk form, while the tools' contract says `file` is relative to the sources folder.

The dependency also points the wrong way: "which originals are ingested" is the knowledge base's fact, and ingesting is its operation; the sources folder should work alone, and the knowledge base build on it.

## Solution

- The sources tools stop knowing about summaries. They take an optional link to the knowledge base (an interface in `sources.ts`, e.g. `IngestLink`: `summariesOf()`, the summary ids by original, relative to the sources folder; `originalRetired(original, why, reason, replacedBy)`), and without it list originals as `present`, as they already do without a knowledge folder.
- The knowledge side implements that link over its `KnowledgeStore`: summaries from `store.list()`/`store.read()` and their `file` field; retiring through `store.retire()` or `store.supersede()`. `buildSessionOptions()` wires it when both folders are set.
- `KnowledgePage.fields.file` is relative to the sources folder in every store (the file store converts from and to its on-disk link), and `ingested()` resolves it from there.
- `summariesByOriginal()` and `markPage()` go, or stay private to the file store.
- This is the shape the sources and knowledge base extensions will have (#29): `sources` standalone, `knowledge` optionally depending on it.

## Verification

- A test with an in-memory `KnowledgeStore` (no files): after creating a summary of an original, `list_sources` says `ingested` and names its summary; changing the original makes it `changed`; `retire_source` with `why: "wrong"` retires the summary and with `"replaced"` supersedes it, through the store; `knowledge_check` reports the same.
- The same tests pass with the file store, and the existing sources and knowledge tests stay green.
- Captain Whiskers: `/captain-whiskers:learn`, then `list_sources`, then retiring an original, as in his test script.
