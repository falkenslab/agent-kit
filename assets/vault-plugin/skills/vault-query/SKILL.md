---
name: vault-query
description: Answer a question from the knowledge vault - find the relevant pages through the index, read them, answer with links to them, and file the answer back as a synthesis page when it is worth keeping.
---

# Querying the vault

The vault exists so a question doesn't start from zero. Answer from it first; go back to the originals or the web only for what it doesn't hold.

1. **Start from the index.** Read `index.md`, pick the pages that can matter, read those (not the whole vault). `Grep` inside the vault for terms and aliases the index doesn't reveal.
2. **Answer from the pages**, linking each one you drew on. Say what comes from the vault, what comes from an original in the sources folder (read it if the vault is thin or contradictory) and what comes from outside (label it as such).
3. **Say what is missing.** If the vault can't answer part of the question, say so and name the source that would fill it, instead of filling the gap from memory silently.
4. **File it back.** If the answer is a comparison, an analysis or a report that will be asked again, save it as `syntheses/<slug>.md` (template in `vault-pages`) with links to its inputs, add it to `index.md`, and log it: `## [date] query | <question>`. A quick factual answer needs no page.
5. **Feed the vault.** If answering revealed a concept or fact that has no page, or a contradiction, fix that in the vault too and log it.
