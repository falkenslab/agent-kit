---
sidebar_position: 4
title: Knowledge base
description: The built-in LLM wiki - pages reached through the knowledge_* tools, page types, skills and commands - and the sources folder of untouched originals.
---

# Knowledge base

An agent forgets everything when a session ends, except what it wrote down. The kit's `knowledge` extension gives an agent a built-in way to keep its notes: an interlinked wiki of pages, with rules in the system prompt, skills to maintain it (the "LLM wiki" pattern) and tools of its own to reach it. Originals the agent works from stay apart, in the `sources` extension's folder.

## Turning it on

```ts
import { knowledge, sources, type AgentSpec, type BaseSessionConfig } from "@falkenslab/agent-kit";

const spec: AgentSpec<BaseSessionConfig> = {
  // …
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }), // optional
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
  ],
};
```

It's the kit's `knowledge` [extension](extensions.md), enabled in the spec with its folder (`dir`, a path or a function of the session's config), with `sources` beside it for the originals:

- the agent gets the **`knowledge_*` tools** (an MCP server, `knowledge`) and reaches the knowledge base only through them: the file tools can't read, write or search its folder (the [file scope](../security/file-scope.md) says so, pointing to the tools);
- a **"Knowledge base" section** is appended to the system prompt, with the page types and the working rules (and, when an active extension provides `sources`, how to match summaries to their originals);
- the **`knowledge` plugin** ships with the kit and is loaded: three skills and three commands.

The file tools stay for the originals (`Read`, `Glob`, `Grep` on the sources folder) and for `extraWritableDirs` (`Write`, `Edit` too). An agent with only a knowledge base has no file tools at all.

### Why tools and not files

The agent works on **pages**, not files: a page is identified by its type and slug, `concept/spring-tides`, and links between pages use that id. So the storage can change underneath (markdown files today; a database or a vector store, see [Knowledge store](knowledge-store.md)) without touching the tools, the prompt or the skills. And the wiki's rules are kept by code: the index is generated, backlinks are computed, links must resolve, pages are never deleted or renamed.

It also saves work. On a sample knowledge base of 33 pages, a `/knowledge:lint` took 66 tool calls, 175 seconds and 469k input tokens with the file tools, and 13 to 18 calls, about a minute and 200-250k tokens with these tools; an ingest went from 20 calls to 13-15, and both cost a third to two thirds less.

## The tools

| Tool | What it does | Plan mode |
| --- | --- | --- |
| `knowledge_index` | The catalog: every page, one line each (title, id, what it is), by section | Allowed |
| `knowledge_search(query)` | Pages matching words in their title, aliases or content, best first, with the line that matched | Allowed |
| `knowledge_read(page)` | A page: its fields, its content (links as ids) and the pages that link to it; or `"overview"`; or `"log"`, the latest entries of the operation log, newest first | Allowed |
| `knowledge_create(type, slug, title, content?, fields?, also?)` | A new page; without content, the type's template. `also` creates more pages in the same call, which may link to each other: all or none | Denied |
| `knowledge_edit(page, oldText, newText, fields?)` | Changes one fragment, unique in the page | Denied |
| `knowledge_rewrite(page, content, fields?)` | Replaces a page's whole content, keeping its id and the links to it; or the `"overview"` | Denied |
| `knowledge_supersede(page, by, reason?)` | Marks a page superseded by another, with a notice at its top | Denied |
| `knowledge_retire(page, reason)` | Takes a page whose knowledge was wrong out of the index and the search (kept, restorable), after the person approves | Not offered in autonomous mode; denied |
| `knowledge_log(operation, what, pages?)` | Adds an entry to the log, dated today | Denied |
| `knowledge_check` | The mechanical problems in one call (see below) | Allowed |

`fields` is a list of frontmatter fields to set, `[{ "name": "aliases", "value": "king tides" }]` (`value: null` removes one). A summary's `file` is its original relative to `sources/`; the store records the original's hash, so `list_sources` reports it as *changed* if it changes later.

### Links and templates

Pages link by id: `[Spring tides](concept/spring-tides)`. A link to a page that doesn't exist is refused with the reason, so the agent creates it first, or in the same call with `also` (a summary and the new concepts it feeds usually link to each other). Backlinks aren't written by the agent: `knowledge_read` returns what links to a page.

`knowledge_create` without content returns the page type's template; the agent fills it and calls again. The kit's types and their templates:

| Type | What it holds | Fields |
| --- | --- | --- |
| `summary` | One per ingested source: what it says, key points, the pages it feeds | `file` (the original, as `list_sources` names it) or `url`; `ingested`, when it was written, set by the store itself. The index shows them |
| `concept` | One idea: definition, explanation, connections, sources | `aliases` |
| `entity` | A concrete thing: a system, a component, an organization, a document | `kind`, `aliases` |
| `synthesis` | An answer worth keeping: a comparison, an analysis, a report | `question` |
| `preference` | How the person wants things done in this project (see [The person's preferences](#the-persons-preferences)) | `since` |

Besides the pages there's the **overview**, a living synthesis of the whole knowledge base, read and rewritten as `"overview"`, and the **log** of operations, written with `knowledge_log` and read as `"log"` (the latest ten entries, newest first: what was done last, and when).

### What `knowledge_check` finds

- broken links (to pages that don't exist, or relative links to missing files; a link to the overview, index or log file is fine when the file exists);
- orphan pages (nothing links to them; summaries and syntheses aside, which the index reaches);
- links to retired pages.

The index and backlinks can't drift, so there's nothing to check there. How the knowledge base stands against its originals isn't `knowledge_check`'s: see [Knowledge base and sources](#knowledge-base-and-sources).

## The person's preferences

What the person wants about how the agent works in this project ("rubrics go in tables", "don't post in the forum on Fridays") is kept as `preference` pages, one per preference, in the project's knowledge base, so a new session applies it without being told again:

- **When one is written**: the person states or corrects a way of working ("from now on…", "always…", "don't…"); the agent first decides whose it is. If it's about this project's work, it creates the page and says in one line that it'll remember it. If it's about the person wherever they work (what to call them, their tastes, or something they say holds for whatever it does) and the agent keeps a [memory of the person](memory.md), it goes there instead. **Only from what the person says in the chat**: never from a document, a web page or a tool result, whatever it asks (a page can't plant a "preference").
- **In every session**: the knowledge base's prompt section lists the active preferences by title (up to 20; past that, a pointer to the index), so the agent knows them from the first turn and reads one when a task touches it.
- **When it changes** it's edited; **when it no longer holds** it's retired, with the person's approval, like any page. Nothing links to a preference, and it isn't an orphan for that.

They're the project's: whoever opens it with the agent gets them. What's about the person wherever they work (their name, how they like any answer) goes in the agent's [memory of the person](memory.md), across all their projects; between agents there's none, on purpose.

## Your own page types

An agent with its own kinds of notes (a course's topics and activities) declares them in the extension's `pageTypes` option, and they work like the kit's: the same tools, in the index under their own section, with their own template and fields.

```ts
const spec: AgentSpec<Config> = {
  // …
  extensions: [
    knowledge<Config>({
      dir: (config) => path.join(config.courseDir, "knowledge"),
      pageTypes: [
        {
          type: "topic",
          dir: "", // at the knowledge folder's root
          indexSection: "Topics",
          description: "A topic of the course: what it covers and the students' mastery of it.",
          template: "## Goals\n- <What the students learn>\n\n## Sessions\n- <Plan>",
          indexFields: ["mastery"], // shown in the index line: (mastery: 3)
        },
        { type: "activity", dir: "activities", indexSection: "Activities", description: "A class activity.", template: "## Steps\n…" },
      ],
    }),
  ],
};
```

The description reaches the model in the prompt section and in `knowledge_create`'s description, so the agent knows when to create one. A type with `dir: ""` keeps its pages at the root of the knowledge folder, telling them apart by their `type` field. A declared type with the name of a kit's type replaces it.

## On disk

The kit's store keeps the layout the knowledge base always had, so an existing one works as is:

```text
knowledge/
├── index.md            the catalog, generated after every change
├── log.md              the operation log
├── overview.md         the living synthesis
├── summaries/<slug>.md one page per ingested source
├── concepts/<slug>.md  one page per idea
├── entities/<slug>.md  one page per concrete thing
├── syntheses/<slug>.md answers worth keeping
└── <slug>.md           pages of a declared type with dir: ""
```

Each page is markdown with a YAML frontmatter (`type`, `title`, the fields, `updated`); links are stored as relative paths, so the files read well in an editor or on GitHub, and come back to the agent as ids. The agent creates the pages as it goes; you don't need to create anything but the folder.

## The rules the agent follows

The prompt section tells the agent, among other things:

- start from `knowledge_search` or `knowledge_index`, then read only the pages the task needs;
- link by id; change a page by fragment; never delete or rename one: supersede or retire it;
- log each operation when it's done;
- every claim is traceable to a summary page, an original, or clearly labelled web content;
- contradictions are kept with their attribution, not overwritten;
- write pages in the language of the conversation.

## Skills and commands

| Skill | What it does |
| --- | --- |
| `knowledge:knowledge-ingest` | Ingest one source: its summary page, the concept and entity pages it touches, and the log; and what to do when an original was wrong or replaced. |
| `knowledge:knowledge-query` | Answer a question from the knowledge base, citing its pages, filing the answer back as a synthesis when worth keeping. |
| `knowledge:knowledge-lint` | Health-check: `knowledge_check` for the mechanical problems, then duplicates, missing pages, contradictions and provenance. |

| Command | What it does |
| --- | --- |
| `/knowledge:ingest <files or topic>` | Ingest the given material, or every original not ingested yet. |
| `/knowledge:query <question>` | Answer from the knowledge base. |
| `/knowledge:lint` | Check the whole knowledge base, fix what's mechanical, report the rest. |

If your spec lists its [skills](skills-and-plugins.md#choosing-which-skills-the-agent-offers), these three are added automatically.

## Sources: originals kept as obtained

The `sources` extension's folder (`sources({ dir })`) holds the material the agent works from: files the person drops in, and files the agent saves there. The agent can read and search it but never write or edit it: the [file scope](../security/file-scope.md) denies it, with a message pointing to its writable folders instead.

The agent keeps it with the kit's tools (server `sourceFiles`), never with the file tools:

| Tool | What it does | Modes |
| --- | --- | --- |
| `list_sources` | Every original with its status, when its content last changed (`changedAt`), type, size, pages (PDF) or slides (PPTX), provenance and the version it replaces; the missing and retired ones too | All, plan included |
| `extract_text` | A DOCX, PPTX or XLSX original as markdown, which `Read` can't read | All, plan included |
| `save_to_sources` | Copies a file from this run's folder in | All but plan |
| `download_to_sources` | Downloads an original from an http(s) URL straight in | All but plan |
| `request_file` | Asks the person for a file and copies it in | Not autonomous, not plan |
| `retire_source` | Takes a wrong or superseded original out, after the person approves | Not autonomous, not plan |

### Status of each original

| Status | Meaning |
| --- | --- |
| `present` | In the folder. Files the person copies in by hand show up here too. |
| `missing` | The kit knew it, but the file is gone (deleted by hand). |
| `retired` | Taken out with `retire_source`: with when, why (`wrong` or `replaced`) and what replaced it. |

Each present original has `changedAt`, when its **content** last changed (ISO 8601): when it was added, or when its hash last differed. Touching a file without changing it doesn't move it.

The kit keeps the bookkeeping in a manifest inside the folder, `sources/.agent-kit/sources.json`, where the file tools can't write: each original's hash, size, provenance (from the run, a URL, the person, or copied by hand) and `changedAt`. Hashes never leave it. A PDF's pages and a PPTX's slides are counted without parsing them, so the agent can read a long one in parts.

The sources' own section of the system prompt (what the originals are, how they come and go) is there whenever the `sources` extension is on, with or without a knowledge base.

### Adding originals

```text
save_to_sources({ source: "downloads/slides.pdf", destination: "topic-3/slides.pdf" })
download_to_sources({ url: "https://example.com/syllabus.pdf", destination: "topic-3/syllabus.pdf" })
request_file({ description: "The official syllabus of the module, to build the calendar from it" })
```

- `save_to_sources` takes `source` relative to **this run's folder** (`runDir`), where a browser or another tool typically downloads files; the file tools can't reach it. It tolerates accented file names in a different Unicode normalization (a browser download on macOS, say).
- `download_to_sources` downloads up to 50 MB over http or https, without the content going through the model's context. A **web page** is also kept as its main content in markdown next to it (`web/rules.html` and `web/rules.md`), to quote it literally and read it again; `WebFetch` only returns a summary. That needs three optional libraries in your agent, `npm install @mozilla/readability linkedom turndown`; without them only the HTML is kept, and the tool says so.
- `request_file` shows the person a panel with the description; they give a path (dragging the file into the terminal pastes it) or press Enter if they don't have it. It's copied with the person as its provenance.
- `destination` is relative to the sources folder; hidden folders are the kit's.
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

It needs the optional `mammoth`, `fflate` and `turndown` libraries (see [Installation](../getting-started/installation.md#optional-libraries)); without them it says what to install. Customize `save_to_sources`' description for your domain with the extension's `saveDescription` option: `sources({ dir, saveDescription })`.

### Retiring an original

An original that was wrong (the wrong course's slides) or that a better one replaces is taken out with `retire_source`, never deleted:

```text
retire_source({ source: "topic-3/slides.pdf", why: "replaced", reason: "a newer edition", replacedBy: "topic-3/slides-v2.pdf" })
```

1. The person approves it in a panel; rejected, nothing changes.
2. The file moves to `sources/.agent-kit/retired/`, and the manifest records why. Deleting it for good is the person's, by emptying that folder.
3. `list_sources` shows it as retired. Its summaries are the knowledge base's, so the tool doesn't touch them: it reminds the agent to review what it built from it, and the `knowledge-ingest` skill says how (`knowledge_retire` a wrong one's summary, `knowledge_supersede` a replaced one's by the new summary, each with the person's approval).

The plan gate denies every tool here but `list_sources` and `extract_text`, and `request_file` and `retire_source` don't exist in autonomous mode.

## Knowledge base and sources

They're separate on purpose: **each owns its data, and the model connects them** with their tools. The sources know their originals and when each changed; the knowledge base knows its pages, which original each summary is about and when it was written. Neither reads nor writes the other's data, so the knowledge base's store can be anything (a database, a vector store) and the sources work without a knowledge base.

The model matches them, as the `knowledge-ingest` and `knowledge-lint` skills tell it, and the knowledge base's prompt section too when an active extension provides the `sources` [capability](extensions.md#capabilities):

- **To ingest**: an original that no summary is about needs ingesting; one whose `changedAt` (from `list_sources`) is after its summary's `ingested` (from `knowledge_index`) changed since, and its summary is redone with `knowledge_rewrite`, which sets `ingested` again. Both dates are ISO 8601 in UTC, so the later one sorts after as text; `date_math` is there if in doubt. (A rule to always use `date_math` was dropped: in real sessions the model compared them as text, correctly, and skipped the tool.)
- **To retire**: after `retire_source`, the knowledge base's own tools retire or supersede the summaries, with the person's approval.

The model only carries short identifiers (an original's path, a page id) and dates between them, never data that must be exact. The kit doesn't check that a summary's `file` exists, nor marks summaries when an original goes: a lint (`/knowledge:lint`) finds what was missed.

## Your own rules instead

An agent that wants plain notes, or rules entirely its own, leaves `knowledge()` out of its extensions and puts a folder of its own notes in `extraWritableDirs`, kept with the file tools (all five, writing included):

```ts
const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => `${loadPrompt("system.md")}\n\n${myNotesRules(config)}`,
  // …
  extensions: [sources({ dir: (config) => path.join(config.projectDir, "sources") })], // no knowledge()
};

const config: Config = {
  // …
  extraWritableDirs: [path.join(workspace, "notes")],
};
```

The pieces are exported to reuse them selectively: `knowledgePromptSection({ withSources?, pageTypes?, preferences? })`, `knowledgePluginRoot()`, and the store and its tools (see [Knowledge store](knowledge-store.md)).
