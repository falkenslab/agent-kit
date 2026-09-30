---
sidebar_position: 4
title: Knowledge base
description: The built-in LLM wiki - folders, rules, skills and commands - and the sources folder of untouched originals.
---

# Knowledge base

An agent forgets everything when a session ends, except what it wrote down. The kit gives every agent with a `knowledgeDir` a built-in way to keep its notes: an interlinked wiki of markdown pages, with rules in the system prompt and skills to maintain it (the "LLM wiki" pattern). Originals the agent works from stay apart, in `sourcesDir`.

## Turning it on

```ts
const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: workspace,
  knowledgeDir: path.join(workspace, "knowledge"),
  sourcesDir: path.join(workspace, "sources"), // optional
};
```

With `knowledgeDir` set, and unless the spec says `knowledgeBase: false`:

- the **file tools** are granted (`Read`, `Write`, `Edit`, `Glob`, `Grep`), scoped so writing is only possible inside `knowledgeDir` (and `extraWritableDirs`);
- a **"Knowledge base" section** is appended to the system prompt, with the layout and the working rules;
- the **`knowledge` plugin** ships with the kit and is loaded: four skills and three commands.

## Layout

```text
knowledge/
├── index.md            catalog of every page, one line each: read first, always
├── log.md              append-only log of what was done to the knowledge base
├── overview.md         living synthesis of the whole knowledge base
├── summaries/<slug>.md one page per ingested source
├── concepts/<slug>.md  one page per idea
├── entities/<slug>.md  one page per concrete thing (a system, a component, an organization, a document)
└── syntheses/<slug>.md answers worth keeping: comparisons, analyses, reports
```

The agent creates the pages as it goes; you don't need to create anything but the folder.

## The rules the agent follows

The prompt section tells the agent, among other things:

- start by reading `index.md`, then only the pages the task needs;
- links are relative markdown links and go both ways;
- never rename, move or delete a page: mark it superseded and link to the new one;
- prefer `Edit` for existing pages, `Write` for new ones;
- after any change, update `index.md` and append an entry to `log.md` (`## [YYYY-MM-DD] ingest | …`);
- every claim is traceable to a summary page, an original, or clearly labelled web content;
- contradictions are kept with their attribution, not overwritten;
- write pages in the language of the conversation; file names stay lowercase ASCII with hyphens.

## Skills and commands

| Skill | What it does |
| --- | --- |
| `knowledge:knowledge-pages` | Exact templates of every page type; loaded before creating or restructuring a page. |
| `knowledge:knowledge-ingest` | Ingest one source: its summary page, the concept and entity pages it touches, links both ways, index and log. |
| `knowledge:knowledge-query` | Answer a question from the knowledge base, with links, filing the answer back as a synthesis when worth keeping. |
| `knowledge:knowledge-lint` | Health-check: broken links, missing index entries, orphans, one-way links, duplicates, contradictions, gaps. |

| Command | What it does |
| --- | --- |
| `/knowledge:ingest <files or topic>` | Ingest the given material, or everything in `sources/` not ingested yet. |
| `/knowledge:query <question>` | Answer from the knowledge base. |
| `/knowledge:lint` | Check the whole knowledge base, fix what's mechanical, report the rest. |

If your spec lists its [skills](skills-and-plugins.md#choosing-which-skills-the-agent-offers), these four are added automatically.

## Sources: originals kept as obtained

`sourcesDir` holds the material the agent works from: files the person drops in, and files the agent saves there. The agent can read and search it but never write or edit it: the [file scope](../security/file-scope.md) denies it, with a message pointing to the notes folder instead.

The only way the agent adds to it is the `save_to_sources` tool:

```text
save_to_sources({ source: "downloads/slides.pdf", destination: "topic-3/slides.pdf" })
```

- `source` is relative to **this run's folder** (`runDir`), where a browser or another tool typically downloads files. The file tools can't reach the run folder; this tool can.
- `destination` is relative to `sourcesDir`.
- It only copies the file (no parsing, no conversion) and **never overwrites**: an existing destination is an error asking for another name.
- It tolerates accented file names written in a different Unicode normalization (a browser download on macOS, say).

`Read` already understands PDFs, Word documents and images, so a saved original is readable right away. Customize the tool's description for your domain with `saveToSourcesDescription` in the spec.

## Your own rules instead

An agent whose notes have their own page types (courses, activities, customers…) turns the built-in knowledge base off and writes its own rules, keeping `knowledgeDir` for the file tools:

```ts
const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => `${loadPrompt("system.md")}\n\n${myNotesRules(config)}`,
  // …
  knowledgeBase: false,
};
```

The pieces are exported to reuse them selectively:

```ts
import { knowledgePluginRoot, knowledgePromptSection } from "@falkenslab/agent-kit";

pluginRoots: (config) => [knowledgePluginRoot(), path.join(here, "plugin")],
buildSystemPrompt: (config) =>
  `${myPrompt}\n\n${knowledgePromptSection(config.projectDir, config.knowledgeDir!, config.sourcesDir)}\n\n${myExtraRules}`,
```
