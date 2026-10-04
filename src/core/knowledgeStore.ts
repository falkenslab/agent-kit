/**
 * The knowledge base as pages, not files (ADR-024): the agent reaches it only through the
 * kit's `knowledge_*` tools, which sit on this interface, so the storage can change (markdown
 * files today, a vector database tomorrow) without touching the tools, the prompt or the
 * skills. A page is identified by its type and slug, `concept/bowline`, and links between
 * pages use that id too: `[Bowline](concept/bowline)`.
 */

/** A kind of page: the kit's four, or one an agent declares (`AgentSpec.knowledgePageTypes`). */
export interface PageType {
  /** Its name, lowercase: `concept`, `topic`. Page ids start with it. */
  type: string;
  /** Where a file store keeps its pages, relative to the knowledge folder; "" for the root. */
  dir: string;
  /** Its section in the index, e.g. "Concepts". */
  indexSection: string;
  /** What it holds and when to create one, in one line: told to the model. */
  description: string;
  /** The page's body skeleton (markdown, under its title), shown when one is created. */
  template: string;
  /** Frontmatter fields shown in the page's index line, e.g. `["mastery"]`. */
  indexFields?: string[];
}

/** One page, as the store returns it. */
export interface KnowledgePage {
  id: string;
  type: string;
  slug: string;
  title: string;
  /** Frontmatter fields besides type and title (aliases, file, url, updated, status...). */
  fields: Record<string, string>;
  /** The markdown body, links to other pages as ids. */
  content: string;
  /** The pages that link to this one. */
  linkedFrom: string[];
}

/** A page's line in a listing. */
export interface PageInfo {
  id: string;
  type: string;
  title: string;
  /** One line: its `description` field, or its first sentence. */
  description: string;
  /** `active`, `superseded` or `retired`. */
  status: string;
  fields: Record<string, string>;
}

export interface SearchHit {
  id: string;
  title: string;
  /** Where it matched, one line. */
  snippet: string;
}

/** What `check()` finds: the mechanical problems, for the agent to fix or report. */
export interface CheckReport {
  /** Links to pages that don't exist. */
  brokenLinks: { page: string; target: string }[];
  /** Pages nothing links to (summaries and syntheses aside, which the index reaches). */
  orphans: string[];
  /** Links to retired pages. */
  linksToRetired: { page: string; target: string }[];
  /** Summary pages whose original is gone from the sources folder. */
  missingOriginals: { page: string; file: string }[];
}

/** A page to create. */
export interface NewPage {
  type: string;
  slug: string;
  title: string;
  content: string;
  fields?: FieldChanges;
}

/** A change to a page's frontmatter fields: a string sets it, null removes it. */
export type FieldChanges = Record<string, string | null>;

/**
 * Where the knowledge base lives. The kit ships one over markdown files
 * (`createFileKnowledgeStore()`); another one (a database, a vector store) implements this
 * interface and is passed with `AgentSpec.knowledgeStore`. Pages are never deleted or renamed:
 * their ids are what links point to.
 */
export interface KnowledgeStore {
  /** The page types it holds, the kit's and the agent's. */
  types(): readonly PageType[];
  /** Every page but the retired ones. */
  list(): Promise<PageInfo[]>;
  /** A page, retired ones included; `null` if there's none. */
  read(id: string): Promise<KnowledgePage | null>;
  /** A new page; fails if the id exists or a link points nowhere. Returns its id. */
  create(type: string, slug: string, title: string, content: string, fields?: FieldChanges): Promise<string>;
  /**
   * Several new pages at once, whose links may point to each other (a summary and the
   * concepts it feeds): all are created, or none. Returns their ids.
   */
  createMany(pages: readonly NewPage[]): Promise<string[]>;
  /** Replaces the one occurrence of `oldText` in a page's body; fails if it's missing or appears more than once. */
  edit(id: string, oldText: string, newText: string, fields?: FieldChanges): Promise<void>;
  /** Replaces a page's whole body, keeping its id. */
  rewrite(id: string, content: string, fields?: FieldChanges): Promise<void>;
  /** Marks a page superseded by another, with a notice at its top. */
  supersede(id: string, by: string, reason?: string): Promise<void>;
  /** Takes a page out of the index and the search (it's kept, and can be restored). */
  retire(id: string, reason: string): Promise<void>;
  /** Pages matching words of `query` in their title, aliases or body, best first. */
  search(query: string, limit?: number): Promise<SearchHit[]>;
  /** The catalog: every active or superseded page, one line each, by section. */
  index(): Promise<string>;
  /** Adds an entry to the operation log, dated today. */
  log(operation: string, what: string, pages?: readonly string[]): Promise<void>;
  /** The mechanical problems. */
  check(): Promise<CheckReport>;
  /** The overview: a living synthesis of the whole knowledge base ("" if none yet). */
  overview(): Promise<string>;
  /** Replaces the overview. */
  writeOverview(content: string): Promise<void>;
}

/** The kit's page types (ADR-008). */
export const BUILT_IN_PAGE_TYPES: readonly PageType[] = [
  {
    type: "summary",
    dir: "summaries",
    indexSection: "Summaries",
    description: "One per ingested source: what it says, its key points and the pages it feeds. Fields: file (the original, relative to sources/) or url; ingested.",
    template: `## Summary
<Two to four paragraphs: what it actually says.>

## Key points
- <Claims, definitions or figures likely to be needed later, quoted literally when exact wording matters.>

## Pages it feeds
- [<Concept or entity>](concept/<slug>)

## New or surprising
- <What this source adds to what the knowledge base already had.>

## Contradictions
- <Conflicts with other pages, linked.>`,
  },
  {
    type: "concept",
    dir: "concepts",
    indexSection: "Concepts",
    description: "One idea per page: its definition, explanation, connections and sources. Fields: aliases (other names, comma-separated).",
    template: `<Definition in one or two sentences.>

## Explanation
<How it works, at the depth the sources give.>

## Connections
- Requires: [<Concept>](concept/<slug>)
- Related: [<Concept>](concept/<slug>) - how

## Sources
- [<Summary>](summary/<slug>) - what it says about this

## Contradictions and open questions
- "<Source A> says X; <source B> says Y" - both attributed.`,
  },
  {
    type: "entity",
    dir: "entities",
    indexSection: "Entities",
    description: "A concrete thing: a system, component, organization or document (a person only as a public role). Fields: kind, aliases.",
    template: `<What it is, one or two sentences.>

## Facts
- <Attributed facts, each linking the summary it comes from.>

## Connections
- [<Concept or entity>](concept/<slug>) - how`,
  },
  {
    type: "synthesis",
    dir: "syntheses",
    indexSection: "Syntheses",
    description: "An answer worth keeping: a comparison, an analysis, a report. Fields: question.",
    template: `<The answer, with links to every page it draws on.>`,
  },
];

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Whether `slug` is lowercase ASCII words joined by hyphens. */
export function isSlug(slug: string): boolean {
  return SLUG.test(slug);
}

/** `type/slug` split, or null when it isn't one. */
export function parseId(id: string): { type: string; slug: string } | null {
  const match = /^([a-z][a-z0-9-]*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(id.trim());
  return match ? { type: match[1], slug: match[2] } : null;
}

/** The ids every `[text](id)` link in `markdown` points to (links that look like page ids). */
export function linkedIds(markdown: string): string[] {
  return [...markdown.matchAll(/\]\(([a-z][a-z0-9-]*\/[a-z0-9]+(?:-[a-z0-9]+)*)(?:#[^)]*)?\)/g)].map((m) => m[1]);
}
