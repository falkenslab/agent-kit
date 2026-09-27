# ADR-008: The kit ships the knowledge base behavior

## Decision

With `knowledgeDir` set (and `spec.knowledgeBase !== false`), the kit appends `knowledgePromptSection()` (layers, layout, working rules of the LLM-wiki pattern) to the system prompt and loads its own `knowledge` plugin (skills and commands for pages, ingest, query, lint).

## Motivation

Every consumer needed the same notes behavior, not just the permissions; keeping it in the kit keeps it consistent and versioned.

## Consequences

The plugin stays domain-agnostic (summaries, concepts, entities, syntheses) and in English. Consumers add their own page types on top (as teacher-agent's course layer does) or opt out and write their own rules.
