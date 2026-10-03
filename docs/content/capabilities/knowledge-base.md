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

The agent keeps it with the kit's tools (server `sourceFiles`), never with the file tools:

| Tool | What it does | Modes |
| --- | --- | --- |
| `list_sources` | Every original with its status, type, size, pages (PDF) or slides (PPTX), provenance, the version it replaces and its summary pages | All, plan included |
| `extract_text` | A DOCX, PPTX or XLSX original as markdown, which `Read` can't read | All, plan included |
| `save_to_sources` | Copies a file from this run's folder in | All but plan |
| `download_to_sources` | Downloads an original from an http(s) URL straight in | All but plan |
| `request_file` | Asks the person for a file and copies it in | Not autonomous, not plan |
| `retire_source` | Takes a wrong or superseded original out, after the person approves | Not autonomous, not plan |

### Status of each original

`list_sources` tells the agent what to do next:

| Status | Meaning |
| --- | --- |
| `new` | No summary page points to it: ingest it. Files the person copies in by hand show up here. |
| `ingested` | A summary page points to it (its frontmatter `file:`), and it hasn't changed since. |
| `changed` | It changed after its ingest (the person replaced it by hand): update its summary. |
| `missing` | The kit knew it, but the file is gone (deleted by hand): its summary points nowhere. |
| `present` | There's no knowledge folder to compare with. |

The kit keeps the bookkeeping in a manifest inside the folder, `sources/.agent-kit/sources.json`, where the file tools can't write: each original's hash, size, provenance (from the run, a URL, the person, or copied by hand) and the hash it had when a summary page first pointed to it. A PDF's pages and a PPTX's slides are counted without parsing them, so the agent can read a long one in parts.

### Adding originals

```text
save_to_sources({ source: "downloads/slides.pdf", destination: "topic-3/slides.pdf" })
download_to_sources({ url: "https://example.com/syllabus.pdf", destination: "topic-3/syllabus.pdf" })
request_file({ description: "The official syllabus of the module, to build the calendar from it" })
```

- `save_to_sources` takes `source` relative to **this run's folder** (`runDir`), where a browser or another tool typically downloads files; the file tools can't reach it. It tolerates accented file names in a different Unicode normalization (a browser download on macOS, say).
- `download_to_sources` downloads up to 50 MB over http or https, without the content going through the model's context. A **web page** is also kept as its main content in markdown next to it (`web/rules.html` and `web/rules.md`), to quote it literally and read it again; `WebFetch` only returns a summary. That needs three optional libraries in your agent, `npm install @mozilla/readability linkedom turndown`; without them only the HTML is kept, and the tool says so.
- `request_file` shows the person a panel with the description; they give a path (dragging the file into the terminal pastes it) or press Enter if they don't have it. It's copied with the person as its provenance.
- `destination` is relative to `sourcesDir`; hidden folders are the kit's.
- Nothing is ever **overwritten**: an existing destination is an error asking for another name.
- A file **identical** to one already there isn't copied again: the tool returns that one's path.
- A **new version** goes under a new name with `replaces` set to the old one (`topic-3/slides-v2.pdf` replacing `topic-3/slides.pdf`); both are kept and the manifest links them.

`Read` reads PDFs and images, so a saved original of those kinds is readable right away. It **can't read DOCX or PPTX** (confirmed: it refuses them as binary files); `extract_text` reads them, and XLSX:

```text
extract_text({ source: "topic-3/slides.pptx", from: 1, to: 10 })
```

- **DOCX**: headings, paragraphs, lists and tables.
- **PPTX**: a section per slide, its title and text as a list, and its **speaker notes**, which often carry the explanation; `from`/`to` pick slides of a long deck (`list_sources` gives the count).
- **XLSX**: a table per sheet, up to 200 rows (the rest are counted).
- Images are left out, and counted.

It needs the optional `mammoth`, `fflate` and `turndown` libraries (see [Installation](../getting-started/installation.md#optional-libraries)); without them it says what to install. Customize `save_to_sources`' description for your domain with `saveToSourcesDescription` in the spec.

### Retiring an original

An original that was wrong (the wrong course's slides) or that a better one replaces is taken out with `retire_source`, never deleted:

```text
retire_source({ source: "topic-3/slides.pdf", why: "replaced", reason: "a newer edition", replacedBy: "topic-3/slides-v2.pdf" })
```

1. The person approves it in a panel; rejected, nothing changes.
2. The file moves to `sources/.agent-kit/retired/`, and the manifest records why. Deleting it for good is the person's, by emptying that folder.
3. Its summary page is marked: `status: retired` and a notice not to rely on it, if it was **wrong**; `status: superseded` with a link to the replacement's summary, if it was **replaced**.
4. The tool reminds the agent to update the index and fix the pages that cite it; the `knowledge-ingest` skill says how.

The plan gate denies every tool here but `list_sources` and `extract_text`, and `request_file` and `retire_source` don't exist in autonomous mode.

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
