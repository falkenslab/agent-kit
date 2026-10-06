---
name: rank-jokes
description: Rank the jokes in the logbook by the parrot's score, and file the ranking back as a synthesis page. Use when asked for the best jokes, a top three, or which jokes scored highest.
requires: knowledge-base
---

# Ranking the jokes in the logbook

1. `knowledge_index`: the jokes are in the "Jokes" section, each with its `score` in its line. Read only the ones you need (`knowledge_read`).
2. Rank them by score, highest first; on a tie, the most recent first. Keep the top three, each with its score and where it comes from (your own, the `pirate-joke` skill, `classic_joke`, or the URL the kitten found it at).
3. File the ranking back as a `synthesis` page (`knowledge_create`, or `knowledge_rewrite` if a ranking page already exists), linking each joke's page, so it isn't worked out again; then `knowledge_log` it as a `query`.
4. If the logbook has no jokes yet, say so and offer one: a classic (`classic_joke`) or a fresh one from the web.
