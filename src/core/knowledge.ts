import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PageType } from "./knowledgeStore.js";

/**
 * The built-in knowledge base (an "LLM wiki"): `sourcesDir` holds the originals, `knowledgeDir`
 * is the wiki the agent writes and maintains, and the rules below plus the plugin's skills
 * (knowledge-pages, knowledge-ingest, knowledge-query, knowledge-lint) and commands (/knowledge:ingest, /knowledge:query,
 * /knowledge:lint) are the schema that tells the agent how. Domain-agnostic on purpose: an agent
 * with its own page types (topics, activities...) opts out with `AgentSpec.knowledgeBase: false` and
 * writes its own rules, or extends these.
 */

/**
 * Absolute path of the plugin shipped with the kit, next to `dist/` (or `src/` under tsx):
 * `assets/knowledge-plugin`, whose skills work through the `knowledge_*` tools, or with
 * `"files"` `assets/knowledge-plugin-files`, whose skills work on the files (ADR-024).
 */
export function knowledgePluginRoot(variant: "tools" | "files" = "tools"): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", variant === "files" ? "knowledge-plugin-files" : "knowledge-plugin");
}

/** A path as shown to the model: relative to the project, forward slashes, with a trailing slash. */
function shown(projectDir: string, dir: string): string {
  return `${path.relative(projectDir, dir).split(path.sep).join("/")}/`;
}

/** The originals' line of the prompt section, the same in both variants. */
function originalsLine(originals: string): string {
  return `- **Originals (read-only for you)**: \`${originals}\`. Never rewrite one; build pages *about* them. \`list_sources\` says which are new (not ingested yet), changed since their ingest or missing; add a file only with \`save_to_sources\`, \`download_to_sources\` or by asking the person (\`request_file\`), and take out a wrong or superseded one only with \`retire_source\`. \`Read\` reads PDFs and images; \`extract_text\` reads DOCX, PPTX (with speaker notes) and XLSX.\n`;
}

/** The section for a knowledge base reached through the `knowledge_*` tools (ADR-024). */
function toolsSection(originals: string | undefined, pageTypes: readonly PageType[]): string {
  return `## Knowledge base
Your memory across sessions is an interlinked knowledge base of pages that you write and maintain yourself — a wiki, not a pile of notes. A future session only knows what is written there, so anything worth remembering must end up in a page, not just in this turn's reply. You reach it only through the \`knowledge_*\` tools. Write page content in the language you are using with the human.

### Layers
${originals ? originalsLine(originals) : ""}- **The knowledge base**: pages identified by type and slug (\`concept/spring-tides\`), plus the \`overview\`, a living synthesis of the whole. Page types: ${pageTypes.map((type) => `\`${type.type}\` (${type.description})`).join("; ")}.
- **The schema**: these rules plus the \`knowledge-ingest\`, \`knowledge-query\` and \`knowledge-lint\` skills. \`knowledge_create\` without content gives a type's template.

### Working rules
- Start from \`knowledge_search\` or \`knowledge_index\`, then \`knowledge_read\` only the pages the task needs.
- Link pages by id, \`[Spring tides](concept/spring-tides)\`; links must point to existing pages. The index and the backlinks ("linked from") are kept for you.
- Change a page with \`knowledge_edit\` (a fragment); \`knowledge_rewrite\` only to redo it whole. Pages are never deleted or renamed: \`knowledge_supersede\` one replaced by another; \`knowledge_retire\` one that was wrong.
- When an operation is done, \`knowledge_log\` it: \`ingest\`, \`query\`, \`lint\` or \`update\`, with the pages touched.
- Every claim must be traceable to a summary page, an original, or — clearly labelled as outside the knowledge base — the web.
- Contradictions are kept, not overwritten: record both versions with attribution in the affected pages.
- Short, focused, well-linked pages beat long ones: when a page mixes two things, split it.`;
}

/**
 * The "Knowledge base" section appended to the system prompt: the layout and the working
 * rules. With `tools` (the kit's default since ADR-024), for a knowledge base reached through
 * the `knowledge_*` tools, listing `pageTypes`; otherwise for one kept with the file tools,
 * whose page templates live in the `knowledge-pages` skill.
 */
export function knowledgePromptSection(
  projectDir: string,
  knowledgeDir: string,
  sourcesDir?: string,
  options: { tools?: boolean; pageTypes?: readonly PageType[] } = {},
): string {
  const notes = shown(projectDir, knowledgeDir);
  const originals = sourcesDir ? shown(projectDir, sourcesDir) : undefined;
  if (options.tools) return toolsSection(originals, options.pageTypes ?? []);
  return `## Knowledge base (${notes})
\`${notes}\` is your memory across sessions, kept as an interlinked knowledge base of markdown pages that you write and maintain yourself — a wiki, not a pile of notes. A future session only knows what is written there, so anything worth remembering must end up in a page, not just in this turn's reply. Write page content in the language you are using with the human; file names stay lowercase ASCII with hyphens.

### Layers
${originals ? originalsLine(originals) : ""}- **The knowledge base**: \`${notes}\`, entirely yours to write.
- **The schema**: these rules plus the \`knowledge-pages\` skill (exact template of every page type — load it before creating a page) and the \`knowledge-ingest\`, \`knowledge-query\` and \`knowledge-lint\` skills.

### Layout
\`\`\`
${notes}
  index.md          catalog of every page, one line each: read it FIRST, always
  log.md            append-only log of what you did to the knowledge base
  overview.md       living synthesis of the whole knowledge base
  summaries/<slug>.md   one page per ingested source
  concepts/<slug>.md    one page per idea
  entities/<slug>.md    one page per concrete thing (system, component, organization, document)
  syntheses/<slug>.md   answers worth keeping: comparisons, analyses, reports
\`\`\`

### Working rules
- Start by reading \`index.md\`, then only the pages the task needs — don't read the whole knowledge base.
- Links are standard markdown links relative to the page, and go both ways: when A links to B, add the link back in B. To find who links to a page, \`Grep\` for its file name inside the knowledge base.
- Never rename, move or delete a page (every link to it would break): if it is superseded, say so at its top and link to the new one.
- Prefer \`Edit\` for changes to an existing page; \`Write\` only for new pages.
- After any change, update \`index.md\` and append \`## [YYYY-MM-DD] <operation> | <what>\` to \`log.md\`, followed by the pages created/updated. Operations: \`ingest\`, \`query\`, \`lint\`, \`update\`.
- Every claim must be traceable to a summary page, an original, or — clearly labelled as outside the knowledge base — the web.
- Contradictions are kept, not overwritten: record both versions with attribution in the affected pages.
- Short, focused, well-linked pages beat long ones: when a page mixes two things, split it.`;
}
