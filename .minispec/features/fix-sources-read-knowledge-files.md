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

Both interfaces are defined by the sources side, so it depends on nothing, and the knowledge side depends on it only when it's on (dependency inversion):

- **The knowledge side consumes the sources side's API** (in-process code, not its MCP tools): a `SourcesFolder` object with `list()` (each original's path, current hash and status), `has(path)` (is it a real original: to validate a summary's `file`), `hash(path)` and `extractText(path)`. The knowledge tools use it to validate `file` and record the hash when a summary is written, and in `knowledge_check` (new, changed and missing originals).
- **The knowledge side implements the sources side's hook**, `IngestLink`: `summariesOf(originals)`, the summary ids by original (relative to the sources folder), and `originalRetired(original, why, reason, replacedBy)`, which retires or supersedes the summaries through `store.retire()`/`store.supersede()` and returns their ids. `list_sources` and `retire_source` call it without knowing who is behind; without it, originals are `present` and retiring touches no summary. `buildSessionOptions()` wires it when both folders are set.
- **The ingest hash moves to the summary.** Today the sources manifest keeps `ingestedHash`, recorded by the knowledge tools through `recordIngest()`: an ingest fact living in the sources' store. Instead, the sources side only gives each original's current hash; the summary keeps the hash of the original it read as a field of its page (e.g. `source_hash`), in its store; "changed" is the knowledge side's comparison of both, inside `summariesOf()`. The manifest stops knowing about ingests. Existing knowledge bases are migrated once: `ingestedHash` from the manifest into the summaries' field.
- `KnowledgePage.fields.file` is relative to the sources folder in every store (the file store converts from and to its on-disk link).
- `summariesByOriginal()`, `markPage()` and `recordIngest()` go from `sources.ts`.
- The model's side is content, not code: the ingest skill tells it to use the sources' MCP tools (`list_sources`, `extract_text`), so as an extension it would `requires: sources`, and the knowledge base's sources parts (the prompt's originals line, `knowledge_check`'s originals) only show with the sources on.
- This is the shape the sources and knowledge base extensions will have (#29): `sources` standalone, `knowledge` optionally depending on it. An interface rather than events: two operations, simpler and easier to test.

## Verification

- A test with an in-memory `KnowledgeStore` (no files): after creating a summary of an original, `list_sources` says `ingested` and names its summary; changing the original makes it `changed`; `retire_source` with `why: "wrong"` retires the summary and with `"replaced"` supersedes it, through the store; `knowledge_check` reports the same.
- The same tests pass with the file store, and the existing sources and knowledge tests stay green.
- The sources tools' tests run with no knowledge base at all, and `sources.ts` imports nothing from the knowledge side.
- A knowledge base whose manifest has `ingestedHash` is migrated: its originals keep their status (`ingested` or `changed`).
- Captain Whiskers: `/captain-whiskers:learn`, then `list_sources`, then retiring an original, as in his test script.
