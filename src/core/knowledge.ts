import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The built-in knowledge base (an "LLM wiki"): `sourcesDir` holds the originals, `knowledgeDir`
 * is the wiki the agent writes and maintains, and the rules below plus the plugin's skills
 * (knowledge-pages, knowledge-ingest, knowledge-query, knowledge-lint) and commands (/knowledge:ingest, /knowledge:query,
 * /knowledge:lint) are the schema that tells the agent how. Domain-agnostic on purpose: an agent
 * with its own page types (topics, activities...) opts out with `AgentSpec.knowledgeBase: false` and
 * writes its own rules, or extends these.
 */

/** Absolute path of the plugin shipped with the kit — `assets/knowledge-plugin` next to `dist/` (or `src/` under tsx). */
export function knowledgePluginRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "knowledge-plugin");
}

/** A path as shown to the model: relative to the project, forward slashes, with a trailing slash. */
function shown(projectDir: string, dir: string): string {
  return `${path.relative(projectDir, dir).split(path.sep).join("/")}/`;
}

/**
 * The "Knowledge base" section appended to the system prompt: the layout and the working
 * rules. The exact page templates live in the `knowledge-pages` skill, to keep this short.
 */
export function knowledgePromptSection(projectDir: string, knowledgeDir: string, sourcesDir?: string): string {
  const notes = shown(projectDir, knowledgeDir);
  const originals = sourcesDir ? shown(projectDir, sourcesDir) : undefined;
  return `## Knowledge base (${notes})
\`${notes}\` is your memory across sessions, kept as an interlinked knowledge base of markdown pages that you write and maintain yourself — a wiki, not a pile of notes. A future session only knows what is written there, so anything worth remembering must end up in a page, not just in this turn's reply. Write page content in the language you are using with the human; file names stay lowercase ASCII with hyphens.

### Layers
${originals ? `- **Originals (read-only for you)**: \`${originals}\`. Never rewrite one; build pages *about* them. Add a file there only with \`save_to_sources\`.\n` : ""}- **The knowledge base**: \`${notes}\`, entirely yours to write.
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
