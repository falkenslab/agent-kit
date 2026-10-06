---
name: knowledge-ingest
description: Ingest one source into the knowledge base - an original in sources/, a document, a page - creating its summary page, creating or updating the concept and entity pages it touches, and logging it.
---

# Ingesting a source into the knowledge base

A source is ingested once, and from then on the knowledge base holds what it taught: later sessions read the pages, not the original again. Its value is in how it connects to what the knowledge base already knows. Work only through the `knowledge_*` tools; links between pages are ids, `[Bowline](concept/bowline)`, and the index and backlinks are kept for you.

## 1. Check it isn't already ingested

The sources and the knowledge base each keep their own data; you match them:

- `list_sources` gives each original with `changedAt`, when its content last changed.
- `knowledge_index` gives each summary with `file`, the original it's about, and `ingested`, when it was written.

An original with no summary needs ingesting. One whose `changedAt` is after its summary's `ingested` changed since: update its summary (`knowledge_rewrite`, which sets `ingested` again). Compare the two dates with `date_math`, one original at a time, never by eye. For a document from elsewhere, `knowledge_search` its title or URL.

## 2. Read it for real

Read the whole source, not its first page (a long PDF in parts: `list_sources` gives its pages). Its path is the sources folder's (named in the system prompt) plus the path `list_sources` gives, from the project folder, not from this skill's folder. `Read` reads PDFs and images; `extract_text` reads DOCX, PPTX (with its speaker notes) and XLSX. If it exists only outside the sources folder, keep the original first: `download_to_sources` for a URL (a web page is kept as markdown too: read that one), `save_to_sources` for a file in the run's folder, `request_file` to ask the person for one.

## 3. Write the summary page

`knowledge_create` with type `summary` (call it once without content to get the template), and the field `file` (the original, exactly as `list_sources` names it) or `url`; `ingested` is set for you. Key points quote literally where exactness matters. Create the new concept and entity pages it feeds in the same call (`also`): they can link to each other.

## 4. Update concepts and entities

For every concept or entity the source explains or relies on, `knowledge_search` it first (under other names and aliases too: a duplicate page is worse than none):
- no page yet: create it, with the summary (`also`) or on its own;
- page exists: add what is new (a better definition, an example, a nuance) with `knowledge_edit`, and link the summary under its sources.

If the source contradicts a page, record both versions with attribution in both pages; don't overwrite.

## 5. Close

`knowledge_log` with operation `ingest`, the source's title and the pages created and updated. Rewrite the `overview` (`knowledge_rewrite`) only if the source changes the big picture. When ingesting several sources in a row, log once at the end.

## An original that was wrong or replaced

`retire_source` (it asks the person itself) moves it aside; `list_sources` shows it as retired, with why and what replaced it. The knowledge base is then yours to update: find its summaries (`knowledge_index`, by `file`) and the passages that cite it (`knowledge_search` its file name). After a wrong one, `knowledge_retire` its summary (it asks the person itself: don't ask them first) and correct or remove what it taught (`knowledge_edit`, or `knowledge_retire` for a page that was only about it). After a replaced one, ingest the new original, `knowledge_supersede` the old summary by the new one, and re-ground those passages on it.
