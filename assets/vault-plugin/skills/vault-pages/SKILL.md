---
name: vault-pages
description: Exact templates and conventions for every page of the knowledge vault (index, log, overview, summary, concept, entity and synthesis pages) - load it before creating a vault page or restructuring one, so every page keeps the same shape and links.
---

# Knowledge vault page templates

The vault's layout and rules are in the system prompt ("Knowledge vault"). This skill only adds the exact shape of each page. Headings and frontmatter keys stay in English (they are structure); the text under them is in the human's language. Dates are `YYYY-MM-DD`. Links are relative markdown links (from `concepts/x.md`, a summary is `../summaries/y.md`; an original file is `../../sources/...`, adjusted to where the folders really are).

Every page starts with YAML frontmatter; `updated` changes whenever you edit the page.

## index.md

The catalog and entry point. One line per page, grouped by section: Summaries, Concepts, Entities, Syntheses (plus any section the domain adds).

```markdown
# Index

## Summaries
- [Q3 architecture review](summaries/q3-architecture-review.md) - decisions taken on the billing service
## Concepts
- [Idempotency](concepts/idempotency.md) - safe retries of a request
```

## log.md

Append-only; never edit past entries. Newest at the bottom.

```markdown
## [2026-10-03] ingest | Q3 architecture review
- created: summaries/q3-architecture-review.md, concepts/idempotency.md
- updated: entities/billing-service.md, index.md
```

## overview.md

A living synthesis of the whole vault, rewritten (not appended) as understanding grows: what it covers, its main blocks and how they connect (with links), what is still unknown.

## Summary page (`summaries/<slug>.md`)

One per ingested source.

```markdown
---
type: summary
title: "<Title>"
file: <relative link to the original in sources/, if any>
url: <original URL, if any>
ingested: YYYY-MM-DD
updated: YYYY-MM-DD
---

# <Title>

## Summary
<Two to four paragraphs: what it actually says.>

## Key points
- Claims, definitions or figures likely to be needed later, quoted literally when exact wording matters.

## Pages it feeds
- [Concept or entity](../concepts/<slug>.md)

## New or surprising
- What this source adds to what the vault already had.

## Contradictions
- Conflicts with other pages, linked.
```

## Concept page (`concepts/<slug>.md`)

One idea per page.

```markdown
---
type: concept
aliases: []
updated: YYYY-MM-DD
---

# <Concept>

<Definition in one or two sentences.>

## Explanation
<How it works, at the depth the sources give.>

## Connections
- Requires: [Concept](<slug>.md)
- Related: [Concept](<slug>.md) - how

## Sources
- [Summary](../summaries/<slug>.md) - what it says about this

## Contradictions and open questions
- "<Source A> says X; <source B> says Y" - both attributed.
```

## Entity page (`entities/<slug>.md`)

A concrete thing: a system, a component, an organization, a document, a person only when they are a public role rather than private individual details.

```markdown
---
type: entity
kind: <system | component | organization | document | other>
aliases: []
updated: YYYY-MM-DD
---

# <Name>

<What it is, one or two sentences.>

## Facts
- Attributed facts, each linking the summary or source it comes from.

## Connections
- [Concept or entity](../concepts/<slug>.md) - how
```

## Synthesis page (`syntheses/<slug>.md`)

An answer worth keeping: a comparison, an analysis, a report.

```markdown
---
type: synthesis
question: "<The question it answers>"
updated: YYYY-MM-DD
---

# <Title>

<The answer, with links to every page it draws on.>
```
