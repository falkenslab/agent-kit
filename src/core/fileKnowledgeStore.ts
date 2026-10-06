import { appendFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BUILT_IN_PAGE_TYPES,
  isSlug,
  linkedIds,
  parseId,
  type CheckReport,
  type FieldChanges,
  type KnowledgePage,
  type KnowledgeStore,
  type NewPage,
  type PageInfo,
  type PageType,
  type SearchHit,
} from "./knowledgeStore.js";

/**
 * The kit's knowledge store over markdown files, in the layout the knowledge base always had
 * (ADR-008): `index.md`, `log.md`, `overview.md` and a folder per page type (`summaries/`,
 * `concepts/`...), or the root for a declared type with `dir: ""`. An existing knowledge base
 * works as is. Links are stored as relative paths, so the files read well on their own, and
 * returned as page ids; the index is rewritten after every change; backlinks are computed.
 */

const RESERVED = new Set(["index", "log", "overview"]);

interface StoredPage {
  id: string;
  type: PageType;
  slug: string;
  file: string;
  fields: Map<string, string>;
  /** As on disk: links as relative paths. */
  body: string;
}

const posix = (p: string): string => p.split(path.sep).join("/");
const today = (): string => new Date().toISOString().slice(0, 10);

function parse(text: string): { fields: Map<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  const fields = new Map<string, string>();
  if (!match) return { fields, body: text.replace(/^\s+/, "") };
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(line);
    if (kv) fields.set(kv[1], kv[2].trim().replace(/^"(.*)"$/, "$1"));
  }
  return { fields, body: text.slice(match[0].length).replace(/^\s+/, "") };
}

function serialize(fields: Map<string, string>, body: string): string {
  const lines = [...fields].map(([key, value]) => `${key}: ${/[:#]/.test(value) && !/^\[.*\]$/.test(value) ? JSON.stringify(value) : value}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.replace(/^\s+/, "").replace(/\s*$/, "")}\n`;
}

/** Options of `createFileKnowledgeStore()`. */
export interface FileKnowledgeStoreOptions {
  /** The agent's own page types, besides the kit's. */
  pageTypes?: readonly PageType[];
}

/** When a summary was written from its original (ISO 8601, as `list_sources`' `changedAt`). */
const stampNow = (): string => new Date().toISOString();

/** A `KnowledgeStore` over the markdown files of `knowledgeDir`. */
export function createFileKnowledgeStore(knowledgeDir: string, options: FileKnowledgeStoreOptions = {}): KnowledgeStore {
  const declared = options.pageTypes ?? [];
  const types: PageType[] = [...BUILT_IN_PAGE_TYPES.filter((t) => !declared.some((d) => d.type === t.type)), ...declared];
  const byType = new Map(types.map((t) => [t.type, t]));

  const fileOf = (type: PageType, slug: string): string => path.join(knowledgeDir, type.dir, `${slug}.md`);

  async function readPage(type: PageType, slug: string): Promise<StoredPage | null> {
    const file = fileOf(type, slug);
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      return null;
    }
    const { fields, body } = parse(text);
    // At the root, a page belongs to the type its frontmatter says.
    if (type.dir === "" && fields.get("type") !== type.type) return null;
    return { id: `${type.type}/${slug}`, type, slug, file, fields, body };
  }

  async function allPages(): Promise<StoredPage[]> {
    const pages: StoredPage[] = [];
    for (const type of types) {
      let names: string[];
      try {
        names = await readdir(path.join(knowledgeDir, type.dir));
      } catch {
        continue;
      }
      for (const name of names.filter((n) => n.endsWith(".md")).sort()) {
        const slug = name.slice(0, -3);
        if (type.dir === "" && RESERVED.has(slug)) continue;
        const page = await readPage(type, slug);
        if (page) pages.push(page);
      }
    }
    return pages;
  }

  async function find(id: string): Promise<StoredPage> {
    const parsed = parseId(id);
    const type = parsed && byType.get(parsed.type);
    if (!parsed || !type) throw new Error(`"${id}" isn't a page id: it's <type>/<slug>, with a type among ${types.map((t) => t.type).join(", ")}.`);
    const page = await readPage(type, parsed.slug);
    if (!page) throw new Error(`There's no page "${id}". knowledge_search or knowledge_index finds the right one.`);
    return page;
  }

  /** Links as ids → relative paths, from `file`. */
  function toFile(markdown: string, file: string): string {
    return markdown.replace(/\]\(([a-z][a-z0-9-]*\/[a-z0-9]+(?:-[a-z0-9]+)*)(#[^)]*)?\)/g, (whole, id: string, anchor = "") => {
      const parsed = parseId(id);
      const type = parsed && byType.get(parsed.type);
      if (!parsed || !type) return whole;
      return `](${posix(path.relative(path.dirname(file), fileOf(type, parsed.slug)))}${anchor})`;
    });
  }

  /** Relative links to pages → ids. */
  function fromFile(markdown: string, file: string, pagesByFile: Map<string, string>): string {
    return markdown.replace(/\]\(([^)\s:]+\.md)(#[^)]*)?\)/g, (whole, link: string, anchor = "") => {
      const id = pagesByFile.get(path.normalize(path.resolve(path.dirname(file), decodeURI(link))));
      return id ? `](${id}${anchor})` : whole;
    });
  }

  const titleOf = (page: StoredPage): string => page.fields.get("title") || /^#\s+(.+)$/m.exec(page.body)?.[1].trim() || page.slug;

  function descriptionOf(page: StoredPage): string {
    const given = page.fields.get("description");
    if (given) return given;
    const line = page.body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#") && !l.startsWith(">") && !l.startsWith("-") && !l.startsWith("<"));
    const sentence = (line ?? "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").split(/(?<=[.!?])\s/)[0];
    return sentence.length > 140 ? `${sentence.slice(0, 139)}…` : sentence;
  }

  const statusOf = (page: StoredPage): string => page.fields.get("status") || "active";

  /** Checks every page first (types, slugs, ids, links among them or to existing pages), then writes them all. */
  async function createPages(newPages: readonly NewPage[]): Promise<string[]> {
    const ids = new Set<string>();
    const ready: StoredPage[] = [];
    for (const { type: typeName, slug, title, content } of newPages) {
      const type = byType.get(typeName);
      if (!type) throw new Error(`"${typeName}" isn't a page type: ${types.map((t) => t.type).join(", ")}.`);
      if (!isSlug(slug)) throw new Error(`"${slug}" isn't a valid slug: lowercase ASCII words joined by hyphens, e.g. "spring-tides".`);
      if (type.dir === "" && RESERVED.has(slug)) throw new Error(`"${slug}" is reserved.`);
      const id = `${type.type}/${slug}`;
      if (ids.has(id) || (await stat(fileOf(type, slug)).catch(() => null))) throw new Error(`"${id}" already exists: edit it, or pick another slug.`);
      ids.add(id);
      const file = fileOf(type, slug);
      const body = /^#\s/.test(content.trimStart()) ? content : `# ${title}\n\n${content}`;
      ready.push({ id, type, slug, file, fields: new Map([["type", type.type], ["title", title]]), body });
    }
    for (const page of ready) await linksResolve(page.body, page.id, ids);
    for (const [i, page] of ready.entries()) {
      const fields = newPages[i].fields ?? {};
      page.body = toFile(page.body, page.file);
      await applyFields(page, fields);
      if (page.type.type === "summary") page.fields.set("ingested", stampNow());
    }
    for (const page of ready) {
      await mkdir(path.dirname(page.file), { recursive: true });
      await writeFile(page.file, serialize(page.fields, page.body));
    }
    await writeIndex();
    return [...ids];
  }

  /** Throws when a link points to a page that doesn't exist (nor is in `alsoCreating`). */
  async function linksResolve(markdown: string, self?: string, alsoCreating: ReadonlySet<string> = new Set()): Promise<void> {
    const missing: string[] = [];
    for (const id of new Set(linkedIds(markdown))) {
      if (id === self || alsoCreating.has(id)) continue;
      const parsed = parseId(id);
      const type = parsed && byType.get(parsed.type);
      if (!type || !parsed || !(await readPage(type, parsed.slug))) missing.push(id);
    }
    if (missing.length) throw new Error(`These links point to pages that don't exist: ${missing.join(", ")}. Create them first, or link existing ones (knowledge_search).`);
  }

  /**
   * Sets or removes the fields given. `type` is the page's, and a summary's `ingested` is the
   * store's (when it was written from its original), so neither is taken from the caller.
   * `file` is kept as given: the original's path relative to the sources folder, which the
   * store doesn't check (the sources are another extension's data, #30).
   */
  async function applyFields(page: StoredPage, changes: FieldChanges = {}): Promise<void> {
    for (const [key, value] of Object.entries(changes)) {
      if (key === "type" || key === "ingested") continue;
      if (value === null) page.fields.delete(key);
      else page.fields.set(key, value);
    }
    page.fields.set("updated", today());
  }

  async function save(page: StoredPage): Promise<void> {
    await mkdir(path.dirname(page.file), { recursive: true });
    await writeFile(page.file, serialize(page.fields, page.body));
    await writeIndex();
  }

  /** The notice under the frontmatter of a superseded or retired page. */
  const withNotice = (body: string, notice: string): string => `> ${notice}\n\n${body.replace(/^> (Superseded|Retired) on [^\n]*\n\n/, "")}`;

  async function indexText(): Promise<string> {
    const pages = (await allPages()).filter((p) => statusOf(p) !== "retired");
    const lines = ["# Index", ""];
    for (const type of types) {
      const own = pages.filter((p) => p.type === type).sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
      if (!own.length) continue;
      lines.push(`## ${type.indexSection}`, "");
      for (const page of own) {
        const extras = (type.indexFields ?? []).filter((f) => page.fields.get(f)).map((f) => `${f}: ${page.fields.get(f)}`);
        const status = statusOf(page) === "superseded" ? " (superseded)" : "";
        lines.push(`- [${titleOf(page)}](${posix(path.relative(knowledgeDir, page.file))}) — ${descriptionOf(page)}${extras.length ? ` (${extras.join(", ")})` : ""}${status}`);
      }
      lines.push("");
    }
    return `${lines.join("\n").trimEnd()}\n`;
  }

  async function writeIndex(): Promise<void> {
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(path.join(knowledgeDir, "index.md"), await indexText());
  }

  async function pagesByFile(): Promise<{ pages: StoredPage[]; byFile: Map<string, string> }> {
    const pages = await allPages();
    return { pages, byFile: new Map(pages.map((p) => [path.normalize(p.file), p.id])) };
  }

  const normalize = (text: string): string =>
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  return {
    types: () => types,

    async list(): Promise<PageInfo[]> {
      return (await allPages())
        .filter((p) => statusOf(p) !== "retired")
        .map((p) => ({ id: p.id, type: p.type.type, title: titleOf(p), description: descriptionOf(p), status: statusOf(p), fields: Object.fromEntries(p.fields) }));
    },

    async read(id: string): Promise<KnowledgePage | null> {
      let page: StoredPage;
      try {
        page = await find(id);
      } catch {
        return null;
      }
      const { pages, byFile } = await pagesByFile();
      const linkedFrom = pages
        .filter((p) => p.id !== page.id && linkedIds(fromFile(p.body, p.file, byFile)).includes(page.id))
        .map((p) => p.id);
      const fields = Object.fromEntries([...page.fields].filter(([key]) => key !== "type" && key !== "title"));
      return { id: page.id, type: page.type.type, slug: page.slug, title: titleOf(page), fields, content: fromFile(page.body, page.file, byFile), linkedFrom };
    },

    async create(typeName, slug, title, content, fields = {}) {
      return (await createPages([{ type: typeName, slug, title, content, fields }]))[0];
    },

    createMany: createPages,

    async edit(id, oldText, newText, fields) {
      const page = await find(id);
      const { byFile } = await pagesByFile();
      const current = fromFile(page.body, page.file, byFile);
      const count = oldText ? current.split(oldText).length - 1 : 0;
      if (count === 0) throw new Error(`The text to replace isn't in "${id}" (as returned by knowledge_read, links as ids). Read it again.`);
      if (count > 1) throw new Error(`The text to replace appears ${count} times in "${id}": include more around it so it's unique.`);
      await linksResolve(newText, id);
      page.body = toFile(current.replace(oldText, () => newText), page.file);
      await applyFields(page, fields);
      await save(page);
    },

    async rewrite(id, content, fields) {
      const page = await find(id);
      await linksResolve(content, id);
      page.body = toFile(/^#\s/.test(content.trimStart()) ? content : `# ${titleOf(page)}\n\n${content}`, page.file);
      await applyFields(page, fields);
      // A summary redone whole is redone from its original: written now.
      if (page.type.type === "summary") page.fields.set("ingested", stampNow());
      await save(page);
    },

    async supersede(id, by, reason) {
      const page = await find(id);
      const replacement = await find(by);
      if (replacement.id === page.id) throw new Error("A page can't supersede itself.");
      const link = posix(path.relative(path.dirname(page.file), replacement.file));
      page.fields.set("status", "superseded");
      page.fields.set("superseded_by", link);
      page.body = withNotice(page.body, `Superseded on ${today()}${reason ? ` (${reason})` : ""}: see [${titleOf(replacement)}](${link}).`);
      await applyFields(page);
      await save(page);
    },

    async retire(id, reason) {
      const page = await find(id);
      page.fields.set("status", "retired");
      page.fields.set("retired", today());
      page.body = withNotice(page.body, `Retired on ${today()}: ${reason}. Don't rely on what it says.`);
      await applyFields(page);
      await save(page);
    },

    async search(query, limit = 10): Promise<SearchHit[]> {
      const terms = normalize(query)
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 1);
      if (!terms.length) return [];
      const hits: (SearchHit & { score: number })[] = [];
      const { pages, byFile } = await pagesByFile();
      for (const page of pages) {
        if (statusOf(page) === "retired") continue;
        const title = normalize(titleOf(page));
        const aliases = normalize(page.fields.get("aliases") ?? "");
        const lines = fromFile(page.body, page.file, byFile)
          .split(/\r?\n/)
          .filter((line) => !/^#\s/.test(line));
        let score = 0;
        let snippet = "";
        for (const term of terms) {
          if (title.includes(term)) score += 5;
          if (aliases.includes(term)) score += 4;
          for (const line of lines) {
            if (normalize(line).includes(term)) {
              score += 1;
              snippet ||= line.trim();
            }
          }
        }
        if (score > 0) hits.push({ id: page.id, title: titleOf(page), snippet: (snippet || descriptionOf(page)).slice(0, 200), score });
      }
      return hits
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ id, title, snippet }) => ({ id, title, snippet }));
    },

    index: indexText,

    async recentLog(limit = 10) {
      const text = await readFile(path.join(knowledgeDir, "log.md"), "utf8").catch(() => "");
      // Entries start with "## [date] operation | what"; the newest are at the bottom.
      const entries = text.split(/\r?\n(?=## )/).filter((entry) => entry.startsWith("## ")).map((entry) => entry.trim());
      return entries.slice(-limit).reverse();
    },

    async log(operation, what, pages = []) {
      await mkdir(knowledgeDir, { recursive: true });
      const file = path.join(knowledgeDir, "log.md");
      const exists = await stat(file).catch(() => null);
      const entry = `## [${today()}] ${operation} | ${what}\n${pages.length ? `- pages: ${pages.join(", ")}\n` : ""}`;
      await appendFile(file, `${exists ? "\n" : "# Log\n\n"}${entry}`);
    },

    async check(): Promise<CheckReport> {
      await writeIndex(); // the one mechanical fix there is: an index.md out of date
      const { pages, byFile } = await pagesByFile();
      const reservedFiles = new Set([...RESERVED].map((name) => path.normalize(path.join(knowledgeDir, `${name}.md`))));
      const known = new Map(pages.map((p) => [p.id, p]));
      const inbound = new Map<string, number>();
      const report: CheckReport = { brokenLinks: [], orphans: [], linksToRetired: [] };
      for (const page of pages) {
        if (statusOf(page) === "retired") continue;
        const body = fromFile(page.body, page.file, byFile);
        // Relative links to .md files that resolve to nothing are broken too. The overview, the
        // index and the log aren't pages but are files: a link to one that exists is fine (a
        // knowledge base written with the file tools links the overview, #22).
        for (const m of page.body.matchAll(/\]\(([^)\s:]+\.md)(?:#[^)]*)?\)/g)) {
          const target = path.normalize(path.resolve(path.dirname(page.file), decodeURI(m[1])));
          if (byFile.has(target) || !target.startsWith(path.normalize(knowledgeDir))) continue;
          if (reservedFiles.has(target) && (await stat(target).catch(() => null))) continue;
          report.brokenLinks.push({ page: page.id, target: posix(path.relative(knowledgeDir, target)) });
        }
        for (const id of new Set(linkedIds(body))) {
          const target = known.get(id);
          if (!target) report.brokenLinks.push({ page: page.id, target: id });
          else if (statusOf(target) === "retired") report.linksToRetired.push({ page: page.id, target: id });
          if (id !== page.id) inbound.set(id, (inbound.get(id) ?? 0) + 1);
        }
      }
      report.orphans = pages
        .filter((p) => statusOf(p) !== "retired" && !["summary", "synthesis", "preference"].includes(p.type.type) && !inbound.get(p.id))
        .map((p) => p.id);
      return report;
    },

    async overview() {
      const file = path.join(knowledgeDir, "overview.md");
      const text = await readFile(file, "utf8").catch(() => "");
      return text ? fromFile(text, file, (await pagesByFile()).byFile) : "";
    },

    async writeOverview(content) {
      await linksResolve(content);
      const file = path.join(knowledgeDir, "overview.md");
      await mkdir(knowledgeDir, { recursive: true });
      await writeFile(file, `${toFile(content.trim(), file)}\n`);
    },
  };
}
