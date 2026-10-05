import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PageType } from "./knowledgeStore.js";

/**
 * The built-in knowledge base (an "LLM wiki"): `sourcesDir` holds the originals, `knowledgeDir`
 * is the wiki the agent maintains through the `knowledge_*` tools (ADR-024), and the rules below
 * plus the plugin's skills (knowledge-ingest, knowledge-query, knowledge-lint) and commands
 * (/knowledge:ingest, /knowledge:query, /knowledge:lint) are the schema that tells it how.
 * Domain-agnostic on purpose: an agent adds its own page types (`AgentSpec.knowledgePageTypes`),
 * or opts out with `AgentSpec.knowledgeBase: false` and writes its own rules.
 */

/** Absolute path of the knowledge base's plugin shipped with the kit, next to `dist/` (or `src/` under tsx). */
export function knowledgePluginRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "knowledge-plugin");
}

/** The section for a knowledge base reached through the `knowledge_*` tools (ADR-024). */
function toolsSection(withSources: boolean, pageTypes: readonly PageType[]): string {
  return `## Knowledge base
Your memory across sessions is an interlinked knowledge base of pages that you write and maintain yourself — a wiki, not a pile of notes. A future session only knows what is written there, so anything worth remembering must end up in a page, not just in this turn's reply. You reach it only through the \`knowledge_*\` tools. Write page content in the language you are using with the human.

### Layers
- **The knowledge base**: pages identified by type and slug (\`concept/spring-tides\`), plus the \`overview\`, a living synthesis of the whole, and the \`log\` of what was done to it (\`knowledge_read\` reads both). Page types: ${pageTypes.map((type) => `\`${type.type}\` (${type.description})`).join("; ")}.
- **The schema**: these rules plus the \`knowledge-ingest\`, \`knowledge-query\` and \`knowledge-lint\` skills. \`knowledge_create\` without content gives a type's template.

### Working rules
- Start from \`knowledge_search\` or \`knowledge_index\`, then \`knowledge_read\` only the pages the task needs.
- Link pages by id, \`[Spring tides](concept/spring-tides)\`; links must point to existing pages. The index and the backlinks ("linked from") are kept for you.
- Change a page with \`knowledge_edit\` (a fragment); \`knowledge_rewrite\` only to redo it whole. Pages are never deleted or renamed: \`knowledge_supersede\` one replaced by another; \`knowledge_retire\` one that was wrong.
- When an operation is done, \`knowledge_log\` it: \`ingest\`, \`query\`, \`lint\` or \`update\`, with the pages touched.
${withSources ? "- A summary records the original it's about (`file`, as `list_sources` names it) and when it was written (`ingested`, set for you); the index shows both. An original needs ingesting when no summary is about it, and again when its `changedAt` (from `list_sources`) is after its summary's `ingested`: compare them with `date_math`, one original at a time, not by eye. When an original is retired, retire (it was wrong) or supersede (it was replaced) its summaries, with the person's approval.\n" : ""}- Every claim must be traceable to a summary page, an original, or — clearly labelled as outside the knowledge base — the web.
- Contradictions are kept, not overwritten: record both versions with attribution in the affected pages.
- Short, focused, well-linked pages beat long ones: when a page mixes two things, split it.`;
}

/**
 * The "Knowledge base" section appended to the system prompt: the layers and the working rules,
 * listing `pageTypes`, for a knowledge base reached through the `knowledge_*` tools (ADR-024).
 * With a sources folder, also how summaries and originals are matched (by the model, with the
 * two extensions' tools: each owns its data, #30); the folder itself is the sources' section.
 */
export function knowledgePromptSection(options: { withSources?: boolean; pageTypes?: readonly PageType[] } = {}): string {
  return toolsSection(Boolean(options.withSources), options.pageTypes ?? []);
}
