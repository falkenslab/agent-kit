---
name: knowledge-query
description: Answer a question from the knowledge base - find the relevant pages, read them, answer citing them, and file the answer back as a synthesis page when it is worth keeping.
---

# Querying the knowledge base

The knowledge base exists so a question doesn't start from zero. Answer from it first; go back to the originals or the web only for what it doesn't hold.

1. **Find the pages.** `knowledge_search` the question's terms (and their synonyms), or `knowledge_index` for the catalog; `knowledge_read` only the pages that matter.
2. **Answer from the pages**, citing each one you drew on. Say what comes from the knowledge base, what from an original in the sources folder (read it if the knowledge base is thin or contradictory) and what from outside (label it as such).
3. **Say what is missing.** If the knowledge base can't answer part of the question, say so and name the source that would fill it, instead of filling the gap from memory silently.
4. **File it back.** If the answer is a comparison, an analysis or a report that will be asked again, `knowledge_create` a `synthesis` page with links to its inputs, and `knowledge_log` it (operation `query`). A quick factual answer needs no page.
5. **Feed the knowledge base.** If answering revealed a concept with no page, or a contradiction, fix that too and log it.
