---
name: knowledge-ingest
description: Ingest one source into the knowledge base - an original in sources/, a document, a page - creating its summary page, creating or updating the concept and entity pages it touches, and logging it.
---

# Ingesting a source into the knowledge base

A source is ingested once, and from then on the knowledge base holds what it taught: later sessions read the pages, not the original again. Its value is in how it connects to what the knowledge base already knows. Work only through the `knowledge_*` tools; links between pages are ids, `[Bowline](concept/bowline)`, and the index and backlinks are kept for you.

## 1. Check it isn't already ingested

`list_sources` gives each original's status and summary pages: *new* needs ingesting; *ingested* has a page; *changed* changed after its ingest (update its summary). For a document from elsewhere, `knowledge_search` its title or URL.

## 2. Read it for real

Read the whole source, not its first page (a long PDF in parts: `list_sources` gives its pages). Its path is the sources folder's (named in the system prompt) plus the path `list_sources` gives, from the project folder, not from this skill's folder. `Read` reads PDFs and images; `extract_text` reads DOCX, PPTX (with its speaker notes) and XLSX. If it exists only outside the sources folder, keep the original first: `download_to_sources` for a URL (a web page is kept as markdown too: read that one), `save_to_sources` for a file in the run's folder, `request_file` to ask the person for one.

## 3. Write the summary page

`knowledge_create` with type `summary` (call it once without content to get the template), and the field `file` (the original, relative to sources/) or `url`. Key points quote literally where exactness matters. Create the new concept and entity pages it feeds in the same call (`also`): they can link to each other.

## 4. Update concepts and entities

For every concept or entity the source explains or relies on, `knowledge_search` it first (under other names and aliases too: a duplicate page is worse than none):
- no page yet: create it, with the summary (`also`) or on its own;
- page exists: add what is new (a better definition, an example, a nuance) with `knowledge_edit`, and link the summary under its sources.

If the source contradicts a page, record both versions with attribution in both pages; don't overwrite.

## 5. Close

`knowledge_log` with operation `ingest`, the source's title and the pages created and updated. Rewrite the `overview` (`knowledge_rewrite`) only if the source changes the big picture. When ingesting several sources in a row, log once at the end.

## An original that was wrong or replaced

`retire_source` (the person approves it) moves it aside and marks its summary retired (wrong) or superseded (replaced). Then `knowledge_check` lists the passages that cite it: after a wrong one, correct or remove what it taught (`knowledge_edit`, or `knowledge_retire` for a page that was only about it); after a replaced one, ingest the new original and re-ground those passages on it.
