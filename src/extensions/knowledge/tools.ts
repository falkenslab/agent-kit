import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { FieldChanges, KnowledgeStore } from "./knowledgeStore.js";
import { askForDecision } from "../../core/hooks/humanInput.js";
import { t } from "../../core/messages/index.js";

/**
 * The `knowledge_*` tools: the only way the agent reaches the built-in knowledge base
 * (ADR-024). They work on pages by id (`concept/bowline`) over a `KnowledgeStore`, never on
 * files, so the storage can change underneath; the store keeps the index and the backlinks.
 */

const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });
const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });
const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Runs a tool's work, turning a thrown error into an answer the model can act on. */
async function attempt(work: () => Promise<string>) {
  try {
    return ok(await work());
  } catch (error) {
    return fail(message(error));
  }
}

/**
 * Text as the model meant it: a body that arrives with escaped newlines ("\\n") and no real
 * one gets them back. A model sometimes double-escapes a long markdown argument, and the page
 * would be stored as one line with literal "\n"s (found by a real session).
 */
export function unescapedText(text: string): string {
  return !text.includes("\n") && text.includes("\\n") ? text.replace(/\\r\\n|\\n/g, "\n").replace(/\\t/g, "\t") : text;
}

const OVERVIEW = "overview";
const LOG = "log";

/** Options of `createKnowledgeServer()`. */
export interface KnowledgeToolsOptions {
  /** This run's folder (for the response file of `knowledge_retire`'s approval). */
  runDir: string;
  /** A person can be asked (not autonomous): adds `knowledge_retire`, which asks first. */
  interactive?: boolean;
}

/** The `knowledge` MCP server over `store`. */
export function createKnowledgeServer(store: KnowledgeStore, options: KnowledgeToolsOptions) {
  const typeNames = store.types().map((t) => t.type);
  // A list of pairs, not z.record(): a record in a tool's schema makes the SDK drop every
  // tool of the server, silently (confirmed empirically).
  const fields = z
    .array(z.object({ name: z.string(), value: z.string().nullable() }))
    .optional()
    .describe('Frontmatter fields to set (value null removes one), e.g. [{"name": "aliases", "value": "tide range, tidal range"}]; for a summary, "file" is its original as list_sources names it (its "ingested" is set for you)');
  const changes = (pairs?: { name: string; value: string | null }[]): FieldChanges | undefined =>
    pairs ? Object.fromEntries(pairs.map(({ name, value }) => [name, value])) : undefined;

  const index = tool(
    "knowledge_index",
    "The knowledge base's catalog: every page, one line each (title, id, what it is), by section. Start here, then read only the pages the task needs.",
    {},
    async () => attempt(async () => (await store.list()).length ? await store.index() : "The knowledge base is empty."),
    { annotations: { readOnlyHint: true } },
  );

  const search = tool(
    "knowledge_search",
    "Find pages by words: in titles, aliases and content, best first, with the line that matched. Search before creating a page, so you don't duplicate one under another name.",
    { query: z.string().describe("Words to look for"), limit: z.number().int().positive().max(50).optional() },
    async (args) =>
      attempt(async () => {
        const hits = await store.search(args.query, args.limit ?? 10);
        return hits.length ? hits.map((hit) => `- ${hit.id} — ${hit.title}: ${hit.snippet}`).join("\n") : "No page matches.";
      }),
    { annotations: { readOnlyHint: true } },
  );

  const read = tool(
    "knowledge_read",
    'A page by its id ("concept/bowline"): its fields, its content (links to other pages as ids) and the pages that link to it. Or "overview" (the living synthesis of the whole knowledge base), or "log" (the latest entries of the operation log, newest first: what was done to the knowledge base, and when).',
    { page: z.string().describe('The page id, "overview" or "log"') },
    async (args) =>
      attempt(async () => {
        if (args.page === OVERVIEW) return (await store.overview()) || "There's no overview yet: write it with knowledge_rewrite (page \"overview\").";
        if (args.page === LOG) {
          if (!store.recentLog) return "This knowledge base's store can't show its log.";
          const entries = await store.recentLog(10);
          return entries.length ? entries.join("\n\n") : "The log is empty: nothing has been logged yet.";
        }
        const page = await store.read(args.page);
        if (!page) throw new Error(`There's no page "${args.page}". knowledge_search or knowledge_index finds the right one.`);
        const fieldLines = Object.entries(page.fields).map(([key, value]) => `${key}: ${value}`);
        return [`id: ${page.id}`, `title: ${page.title}`, ...fieldLines, `linked from: ${page.linkedFrom.join(", ") || "(nothing)"}`, "", page.content].join("\n");
      }),
    { annotations: { readOnlyHint: true } },
  );

  const create = tool(
    "knowledge_create",
    `Create a page. Types: ${store
      .types()
      .map((type) => `${type.type} (${type.description})`)
      .join("; ")}. Without content, returns the type's template: fill it and call again. Links to other pages are ids, [Bowline](concept/bowline), and must exist, or be created in the same call (\`also\`); the index is kept for you.`,
    {
      type: z.enum(typeNames as [string, ...string[]]),
      slug: z.string().describe('Lowercase ASCII words joined by hyphens, e.g. "spring-tides"'),
      title: z.string().describe("The page's title, in the language you reply in"),
      content: z.string().optional().describe("The page's markdown body (under its title), following the type's template"),
      fields,
      also: z
        .array(
          z.object({
            type: z.enum(typeNames as [string, ...string[]]),
            slug: z.string(),
            title: z.string(),
            content: z.string(),
            fields,
          }),
        )
        .optional()
        .describe("More pages to create in the same call, which may link to each other and to this one (a summary and the new concepts it feeds): all are created, or none"),
    },
    async (args) =>
      attempt(async () => {
        const type = store.types().find((t) => t.type === args.type)!;
        if (!args.content) return `Template for a ${type.type} page (${type.description}):\n\n${type.template}\n\nFill it in the language you reply in and call knowledge_create again with content.`;
        const ids = await store.createMany([
          { type: args.type, slug: args.slug, title: args.title, content: unescapedText(args.content), fields: changes(args.fields) },
          ...(args.also ?? []).map((page) => ({ ...page, content: unescapedText(page.content), fields: changes(page.fields) })),
        ]);
        return `Created ${ids.join(", ")}.`;
      }),
  );

  const edit = tool(
    "knowledge_edit",
    "Change one fragment of a page: oldText (exactly as knowledge_read returned it, unique in the page) becomes newText. Prefer it to rewriting a page.",
    { page: z.string(), oldText: z.string(), newText: z.string(), fields },
    async (args) =>
      attempt(async () => {
        await store.edit(args.page, unescapedText(args.oldText), unescapedText(args.newText), changes(args.fields));
        return `Edited ${args.page}.`;
      }),
  );

  const rewrite = tool(
    "knowledge_rewrite",
    'Replace a page\'s whole content, keeping its id and the links to it: for a page redone from a better source, or the "overview" (the living synthesis of the whole knowledge base). For small changes use knowledge_edit.',
    { page: z.string().describe('The page id, or "overview"'), content: z.string(), fields },
    async (args) =>
      attempt(async () => {
        if (args.page === OVERVIEW) {
          await store.writeOverview(unescapedText(args.content));
          return "Rewrote the overview.";
        }
        await store.rewrite(args.page, unescapedText(args.content), changes(args.fields));
        return `Rewrote ${args.page}.`;
      }),
  );

  const supersede = tool(
    "knowledge_supersede",
    "Mark a page superseded by another one (it stays, with a notice pointing to the new one). Pages are never deleted or renamed.",
    { page: z.string(), by: z.string().describe("The page that replaces it"), reason: z.string().optional() },
    async (args) =>
      attempt(async () => {
        await store.supersede(args.page, args.by, args.reason);
        return `${args.page} is now superseded by ${args.by}. Repoint the links that should go to the new page.`;
      }),
  );

  const retire = tool(
    "knowledge_retire",
    "Retire a page whose knowledge was wrong (e.g. learned from a wrong original). It asks the person itself, with a panel: don't ask them first. Retired, it leaves the index and the search but is kept. Then fix the pages that link to it (knowledge_check lists them).",
    { page: z.string(), reason: z.string().describe("Why, in one sentence, in the language you reply in") },
    async (args) =>
      attempt(async () => {
        const page = await store.read(args.page);
        if (!page) throw new Error(`There's no page "${args.page}".`);
        const answer = await askForDecision(options.runDir, { title: t().retirePageTitle, lines: [`${page.title} (${page.id})`, args.reason] });
        if (answer === "q") return "The person stopped: don't retire it, and stop what you were doing.";
        if (answer !== "" && answer !== "y" && answer !== "yes") return "The person said no: the page stays.";
        await store.retire(args.page, args.reason);
        return `Retired ${args.page}. Now fix the pages that link to it (knowledge_check).`;
      }),
  );

  const log = tool(
    "knowledge_log",
    "Add an entry to the knowledge base's log, dated today: once an operation is done (an ingest, a query filed back, a lint, an update), what it was and the pages it touched.",
    {
      operation: z.string().describe('"ingest", "query", "lint" or "update"'),
      what: z.string().describe("What, in one line"),
      pages: z.array(z.string()).optional().describe("The ids of the pages created or changed"),
    },
    async (args) =>
      attempt(async () => {
        await store.log(args.operation, args.what, args.pages ?? []);
        return "Logged.";
      }),
  );

  const check = tool(
    "knowledge_check",
    "The knowledge base's mechanical problems in one call: broken links, orphan pages and links to retired pages. Fix what's mechanical; report what needs the person. Whether its summaries are up to date with their originals is a comparison you make: list_sources' changedAt against each summary's ingested (knowledge_index shows them): both ISO 8601 in UTC, the later one sorts after as text.",
    {},
    async () => attempt(async () => JSON.stringify(await store.check(), null, 2)),
    { annotations: { readOnlyHint: true } },
  );

  return createSdkMcpServer({
    name: "knowledge",
    version: "1.0.0",
    tools: [index, search, read, create, edit, rewrite, supersede, ...(options.interactive ? [retire] : []), log, check],
  });
}
