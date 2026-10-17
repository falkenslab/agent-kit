# Extension descriptions and READMEs per language

Issue: [#67](https://github.com/falkenslab/agent-kit/issues/67)

## Goal

An extension's description and README reach the person in their language (the session's, English as fallback), in the chat, the command and the catalog, while Claude Code keeps reading the English one.

## Context

- An extension's description is `plugin.json`'s `description`, in English: Claude Code reads it, the kit shows it, and `agent-kit-catalog` copies it into `catalog.json`.
- Capabilities already have texts per language (#62); the description doesn't.
- agent-kit-extensions' catalog page is in English and Spanish, and its extensions have `README.es.md`; their cards' descriptions stay in English, and so does the chats' catalog.

## Changes

- `metadata["agent-kit"].description`: `{ "es": "…", "fr": "…", "de": "…" }`, English staying in the top-level `description`. In the schema and the manifest readers.
- The kit shows it in the session's language: the catalog's entries (`CatalogEntry.description`, which `/extensions search` and Captain Whiskers' drawer use, the search matching it), and `extension info` (its description, and its `README.<lang>.md` when there's one).
- The prompt keeps English: the model reads English (ADR-019).
- `agent-kit-catalog` writes `descriptions` (`en` and each language given) and `readmes` (the URL of each `README.md` and `README.<lang>.md` the folder has) into `catalog.json`, next to `description` and `readme`; the catalog's schema says so.
- Tests: reading and choosing the language with English as fallback, the catalog's entry and search, `extension info`, the generator's output and checks against the schemas.
- Docs: Extensions → writing (agent-kit's data), reference, publishing; the generator's README.

## Acceptance

- In a Spanish session, an extension with a Spanish description shows it in `/extensions search` and the captain's drawer; one without shows the English.
- `catalog.json` gives `descriptions.es` and `readmes.es` for an extension with both, and neither key for one with English only.
- `claude plugin validate --strict` still passes for an extension with descriptions per language.
- `verify` passes.
