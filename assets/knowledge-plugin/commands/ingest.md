---
description: Ingest material into the knowledge base right now - the files or topic given, or everything in sources/ not ingested yet
---

Apply the `knowledge-ingest` skill right now to: $ARGUMENTS

If nothing is given above, ingest every original in `list_sources` that no summary is about, and update the summaries whose original's `changedAt` is after their `ingested` (both ISO 8601 in UTC: the later one sorts after as text). When you're done, summarize which pages you created and updated, and anything you couldn't read.
