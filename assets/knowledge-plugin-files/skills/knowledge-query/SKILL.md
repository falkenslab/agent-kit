---
name: knowledge-query
description: Answer a question from the knowledge base - find the relevant pages through the index, read them, answer with links to them, and file the answer back as a synthesis page when it is worth keeping.
---

# Querying the knowledge base

The knowledge base exists so a question doesn't start from zero. Answer from it first; go back to the originals or the web only for what it doesn't hold.

1. **Start from the index.** Read `index.md`, pick the pages that can matter, read those (not the whole knowledge base). `Grep` inside the knowledge base for terms and aliases the index doesn't reveal.
2. **Answer from the pages**, linking each one you drew on. Say what comes from the knowledge base, what comes from an original in the sources folder (read it if the knowledge base is thin or contradictory) and what comes from outside (label it as such).
3. **Say what is missing.** If the knowledge base can't answer part of the question, say so and name the source that would fill it, instead of filling the gap from memory silently.
4. **File it back.** If the answer is a comparison, an analysis or a report that will be asked again, save it as `syntheses/<slug>.md` (template in `knowledge-pages`) with links to its inputs, add it to `index.md`, and log it: `## [date] query | <question>`. A quick factual answer needs no page.
5. **Feed the knowledge base.** If answering revealed a concept or fact that has no page, or a contradiction, fix that in the knowledge base too and log it.
