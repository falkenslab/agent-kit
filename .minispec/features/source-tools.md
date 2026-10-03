# Tools to manage the sources folder

Issue: [#14](https://github.com/falkenslab/agent-kit/issues/14)

## Goal

The agent keeps `sourcesDir` with the kit's tools: it sees what's new, ingested or changed, adds originals from the run or from a URL with their provenance, without duplicates, keeps a new version next to the old one instead of overwriting it, and retires a wrong or superseded original with the person's approval.

## Context

- `sourcesDir` holds the originals, read-only for the agent: it reads them with `Read` and adds to them only with `save_to_sources` (a copy from the run's folder, never overwriting). Most originals are copied in by the person by hand.
- Nothing tells the agent which originals have no summary yet, or which changed after being ingested (version 2 of a topic's slides): the knowledge base goes stale silently.
- Provenance (URL, date) is written by the model in the summary's frontmatter, when it remembers. The same file saved twice under two names is kept twice. Downloading an original needs a browser or Bash.
- Originals stay files whatever the knowledge base's storage (ADR-024); this doesn't depend on `knowledge-tools` (#13), which will use it.

## Changes

- A sources manifest kept by the kit (where: to decide in review, e.g. a hidden file in `sourcesDir` that the file tools can't write): per original, its hash, size, provenance (run file or URL, date) and the version it replaces.
- `list_sources()`: every original with its status: *new* (no summary page links to it), *ingested*, *changed* (its hash differs from the one recorded when it was ingested), *missing* (in the manifest, but the person deleted the file by hand); type and size. Files the person copied in by hand are picked up as new. Retired originals aren't listed.
- `save_to_sources` (existing): records provenance and hash; an identical file already in the folder isn't copied again, the existing path is returned.
- `download_to_sources(url, destination)`: downloads an original straight into `sourcesDir` (never overwrites; same duplicate check and provenance), without its content going through the model's context. Size limit and allowed schemes (`http`, `https`).
- A new version: `replaces` on both tools stores the file next to the old one (e.g. `slides-v2.pdf`) and records which one it replaces; the old one is never touched.
- Ingest status before #13: from the summaries' frontmatter `file`, and the hash recorded at ingest (to decide in review: frontmatter field or manifest entry; with #13, `knowledge_create` records it).
- `retire_source(path, reason, replacedBy?)`, for a wrong original or one replaced by a better one: always asks the person first (approval panel), so it isn't offered in autonomous mode, and the plan gate denies it. It moves the file to a hidden retired folder inside `sourcesDir` (reversible) and records reason, date and replacement in the manifest; deleting for good is the person's, by emptying that folder. If the original had a summary, the summary is marked superseded, pointing to the replacement's summary if there is one (pages are never deleted).
- No other tool deletes, moves or renames an original.
- Check empirically whether `Read` reads DOCX and PPTX (`save_to_sources`' description says DOCX): the answer decides whether an `extract_text` tool is worth a feature of its own.
- Labels and phrases for the new tools in the four languages; the knowledge skills (`knowledge-ingest`, `knowledge-lint`) use `list_sources` instead of `Glob`.
- Docs: the knowledge base guide (sources), session options, security (sources folder); `architecture.md`.

## Acceptance

- `list_sources()` tells new, ingested and changed originals apart, including files copied in by hand and a file replaced by hand after its ingest.
- Saving or downloading a file identical to one already there keeps one copy and returns its path; provenance and hash are recorded for every addition.
- A new version with `replaces` keeps both files and the link between them; nothing in `sourcesDir` is ever overwritten.
- `download_to_sources` refuses other schemes and files over the limit.
- `retire_source` asks first, moves the file to the retired folder (nothing deleted), records why, and marks its summary superseded; rejected, nothing changes. A file deleted by hand shows as missing.
- Tests for the manifest, each tool and the duplicate and version cases; `verify` passes, captain-whiskers included.
