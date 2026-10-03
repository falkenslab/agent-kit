import path from "node:path";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { addSource, listSources, resolveWithin, retireSource, type AddedSource } from "../sources.js";
import { askForDecision, askForText } from "../hooks/humanInput.js";
import { t } from "../messages/index.js";
import { EXTRACTABLE, extractText } from "../extractText.js";

/**
 * `resolvedPath` as given if it exists; otherwise, a same-directory sibling whose
 * filename is Unicode-equal under NFC normalization. Needed because a file downloaded via
 * a real browser navigation can land on disk with an accented filename in NFD
 * (decomposed) form, while the model's own `source` argument, being ordinary typed/read
 * text, is normally NFC (composed). The two look character-for-character identical but
 * differ byte-for-byte, so a literal `copyFile` throws ENOENT even though the file is
 * right there under a name that reads identically.
 */
async function resolveExistingFileToleratingNormalization(resolvedPath: string): Promise<string | undefined> {
  try {
    await stat(resolvedPath);
    return resolvedPath;
  } catch {
    // fall through to the normalization-tolerant lookup below
  }

  const dir = path.dirname(resolvedPath);
  const wantName = path.basename(resolvedPath).normalize("NFC");
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return undefined;
  }
  const match = entries.find((name) => name.normalize("NFC") === wantName);
  return match ? path.join(dir, match) : undefined;
}

// Confirmed empirically: the SDK's Read tool reads PDFs and images, but refuses DOCX and
// PPTX ("This tool cannot read binary files").
const DEFAULT_DESCRIPTION =
  "Copy a file from this run's own folder (e.g. something just downloaded) into a folder " +
  "under sources/, where original files are kept as they were obtained, apart from your " +
  "own notes. Read reads PDFs and images there; DOCX, PPTX and XLSX are read with extract_text. This tool does " +
  "no conversion, never overwrites a file already in sources/, and doesn't copy a file " +
  "identical to one already there (it returns that one's path). For a new version of an " +
  "original, save it under a new name with `replaces` set to the old one. Use it right after " +
  "downloading a document you're about to study in depth, so later sessions have it too.";

/** The most `download_to_sources` and `request_file` copy in. */
export const MAX_SOURCE_BYTES = 50 * 1024 * 1024;

const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });
const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });
const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

function added(result: AddedSource, extra = ""): string {
  return result.duplicateOf
    ? `An identical file is already in sources/${result.duplicateOf}: nothing was copied. Use that one.`
    : `Saved to sources/${result.path}.${extra}`;
}

/**
 * The main content of a web page as markdown, with the optional libraries
 * (`@mozilla/readability`, `linkedom`, `turndown`); null when they aren't installed or the
 * page has no readable content.
 */
export async function htmlToMarkdown(html: string, url: string): Promise<string | null> {
  try {
    const [{ Readability }, { parseHTML }, { default: TurndownService }] = await Promise.all([
      import("@mozilla/readability"),
      import("linkedom"),
      import("turndown"),
    ]);
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document).parse();
    if (!article?.content) return null;
    const markdown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" }).turndown(article.content);
    return `# ${article.title ?? url}\n\nSource: ${url}\n\n${markdown}\n`;
  } catch {
    return null;
  }
}

/** Downloads `url` into `file`, refusing other schemes and anything over `maxBytes`; returns its content type. */
export async function downloadToFile(url: string, file: string, maxBytes: number): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`"${url}" isn't a URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`Only http and https URLs can be downloaded, not "${parsed.protocol}".`);
  const response = await fetch(parsed, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`The download failed: HTTP ${response.status}.`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error(`The file is ${declared} bytes, over the ${maxBytes}-byte limit.`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > maxBytes) throw new Error(`The file is over the ${maxBytes}-byte limit.`);
    chunks.push(chunk);
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.concat(chunks));
  return response.headers.get("content-type") ?? "";
}

/** Options of `createSaveToSourcesServer()`. */
export interface SourceToolsOptions {
  /** The knowledge folder, to tell which originals have a summary page (`list_sources`). */
  knowledgeDir?: string;
  /** The project root: paths in the tools' answers are relative to it. Defaults to the parent of `sourcesDir`. */
  projectDir?: string;
  /** A person can be asked (not autonomous): adds `request_file` and `retire_source`, which ask first. */
  interactive?: boolean;
  /** The most `download_to_sources` and `request_file` copy in; 50 MB by default. */
  maxBytes?: number;
}

/**
 * The tools that keep `sourcesDir`, the originals the agent reads but never edits (Write/Edit
 * are scoped to the notes folder, see hooks/fileScopeGate.ts): `save_to_sources`,
 * `list_sources` and `download_to_sources`, plus `request_file` and `retire_source` when a
 * person can be asked. Nothing is ever overwritten or deleted; the bookkeeping is in
 * sources.ts.
 */
export function createSaveToSourcesServer(runDir: string, sourcesDir: string, description = DEFAULT_DESCRIPTION, options: SourceToolsOptions = {}) {
  const projectDir = options.projectDir ?? path.dirname(sourcesDir);
  const maxBytes = options.maxBytes ?? MAX_SOURCE_BYTES;
  const replaces = z.string().optional().describe("For a new version: the original it replaces, relative to sources/ (kept, never overwritten)");

  const saveToSources = tool(
    "save_to_sources",
    description,
    {
      source: z.string().describe("Path to the file, relative to this run's own folder - not a URL"),
      destination: z.string().describe('Path to save it under, relative to sources/, e.g. "topic-3/slides.pdf"'),
      replaces,
    },
    async (args) => {
      const candidate = resolveWithin(runDir, args.source);
      if (!candidate) return fail(`"${args.source}" isn't inside this run's folder - refusing to read it.`);
      const resolvedSource = await resolveExistingFileToleratingNormalization(candidate);
      if (!resolvedSource) {
        return fail(`Couldn't find "${args.source}" in this run's folder (checked byte-for-byte and Unicode-normalized names) - double check the exact path, e.g. with Glob.`);
      }
      try {
        const relative = path.relative(runDir, resolvedSource).split(path.sep).join("/");
        return ok(added(await addSource(sourcesDir, resolvedSource, args.destination, { kind: "run", from: relative }, { replaces: args.replaces })));
      } catch (error) {
        return fail(message(error));
      }
    },
  );

  const listSourcesTool = tool(
    "list_sources",
    "List the originals in sources/ with their status: new (no summary page points to it: ingest it), ingested, changed (it changed after its ingest: update its summary), missing (deleted by hand) or present (no knowledge base to compare with); with type, size, pages of a PDF or slides of a PPTX (read long ones in parts), provenance, the version it replaces and its summary pages. Use it instead of listing the folder.",
    {},
    async () => {
      try {
        return ok(JSON.stringify(await listSources(sourcesDir, options.knowledgeDir, projectDir), null, 2));
      } catch (error) {
        return fail(message(error));
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const extractTextTool = tool(
    "extract_text",
    "Read a Word (DOCX), PowerPoint (PPTX) or Excel (XLSX) original in sources/ as markdown, which Read can't: a document's headings, paragraphs, lists and tables; a deck's slides with their speaker notes (`from`/`to` pick slides of a long one; list_sources gives the count); a workbook's sheets as tables. Images are left out.",
    {
      source: z.string().describe("The original, relative to sources/"),
      from: z.number().int().positive().optional().describe("First slide (PPTX)"),
      to: z.number().int().positive().optional().describe("Last slide (PPTX)"),
    },
    async (args) => {
      const file = resolveWithin(sourcesDir, args.source);
      if (!file || !(await stat(file).catch(() => null))?.isFile()) return fail(`"${args.source}" isn't an original in sources/ (list_sources lists them).`);
      if (!EXTRACTABLE.has(path.extname(file).slice(1).toLowerCase())) return fail(`extract_text reads DOCX, PPTX and XLSX; read "${args.source}" with Read.`);
      try {
        return ok(await extractText(file, args.from, args.to));
      } catch (error) {
        return fail(message(error));
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const downloadToSources = tool(
    "download_to_sources",
    `Download an original (a PDF, an image, a web page...) from an http(s) URL straight into sources/, without its content going through your context; up to ${Math.round(maxBytes / 1024 / 1024)} MB, never overwriting, and not at all if an identical file is already there. A web page is also kept as its main content in markdown next to it (when the kit's optional libraries are installed), to quote literally and read again: WebFetch only gives a summary.`,
    {
      url: z.string().describe("The http or https URL"),
      destination: z.string().describe('Path to save it under, relative to sources/, e.g. "topic-3/syllabus.pdf" or "web/rules.html"'),
      replaces,
    },
    async (args) => {
      const temp = path.join(runDir, "downloads", `${Date.now()}-${path.basename(args.destination)}`);
      try {
        const type = await downloadToFile(args.url, temp, maxBytes);
        const result = await addSource(sourcesDir, temp, args.destination, { kind: "url", from: args.url }, { replaces: args.replaces });
        let extra = "";
        if (!result.duplicateOf && /html/i.test(type)) {
          const html = await readFile(temp, "utf8");
          const markdown = await htmlToMarkdown(html, args.url);
          if (markdown) {
            const mdTemp = `${temp}.md`;
            await writeFile(mdTemp, markdown);
            const mdDestination = args.destination.replace(/\.[^./]+$/, "") + ".md";
            try {
              const md = await addSource(sourcesDir, mdTemp, mdDestination, { kind: "url", from: args.url }, { derivedFrom: result.path });
              extra = md.duplicateOf ? "" : ` Its main content is in sources/${md.path}: read that one.`;
            } catch (error) {
              extra = ` (Its markdown wasn't kept: ${message(error)})`;
            }
          } else {
            extra = " (No markdown copy: the page had no readable content, or the kit's optional libraries for it aren't installed.)";
          }
        }
        return ok(added(result, extra));
      } catch (error) {
        return fail(message(error));
      } finally {
        await rm(temp, { force: true });
        await rm(`${temp}.md`, { force: true });
      }
    },
  );

  const requestFile = tool(
    "request_file",
    "Ask the person for a file you need (a syllabus, a document they have) and copy it into sources/ with its provenance. They give a path or say they don't have it; never overwrites, and doesn't copy a file identical to one already there.",
    {
      description: z.string().describe("What file you need and why, in one or two sentences, in the person's language"),
      destination: z.string().optional().describe("Path to save it under, relative to sources/; the file's own name if omitted"),
      replaces,
    },
    async (args) => {
      const answer = (await askForText(runDir, { title: t().fileRequestTitle, lines: [args.description], question: t().fileRequestQuestion })).replace(/^["']|["']$/g, "").trim();
      if (!answer) return ok("The person doesn't have that file (or didn't give one). Go on without it, or ask for something else.");
      const file = path.resolve(answer);
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) return fail(`"${answer}" isn't a file the person has here. Ask again if needed.`);
      if (info.size > maxBytes) return fail(`"${answer}" is ${info.size} bytes, over the ${maxBytes}-byte limit.`);
      try {
        return ok(added(await addSource(sourcesDir, file, args.destination ?? path.basename(file), { kind: "person", from: path.basename(file) }, { replaces: args.replaces })));
      } catch (error) {
        return fail(message(error));
      }
    },
  );

  const retire = tool(
    "retire_source",
    'Retire an original that was wrong ("wrong") or replaced by a better one ("replaced"), after the person approves it: it\'s moved to sources/.agent-kit/retired/ (never deleted), and its summary page is marked retired (wrong) or superseded, pointing to the replacement\'s summary (replaced). Afterwards, update the index and correct or re-ground the pages that cited it.',
    {
      source: z.string().describe("The original, relative to sources/"),
      why: z.enum(["wrong", "replaced"]),
      reason: z.string().describe("Why, in one sentence, in the person's language"),
      replacedBy: z.string().optional().describe('For "replaced": the original that replaces it, relative to sources/'),
    },
    async (args) => {
      const answer = await askForDecision(runDir, { title: t().retireTitle, lines: t().retireLines(args.source, args.why, args.reason, args.replacedBy) });
      if (answer !== "" && answer !== "y" && answer !== "yes") return ok(answer === "q" ? "The person stopped: don't retire it, and stop what you were doing." : "The person said no: the original stays.");
      try {
        const result = await retireSource(sourcesDir, options.knowledgeDir, projectDir, args.source, args.why, args.reason, args.replacedBy);
        const pages = result.summaries.map((s) => `${s.page} marked ${s.marked}${s.supersededBy ? ` (see ${s.supersededBy})` : ""}`);
        return ok(
          [
            `Retired: moved to sources/${result.movedTo}.`,
            ...(pages.length ? pages : ["It had no summary page."]),
            "Now update index.md, and correct or re-ground the pages that cite it (search the knowledge base for its file name).",
          ].join("\n"),
        );
      } catch (error) {
        return fail(message(error));
      }
    },
  );

  return createSdkMcpServer({
    name: "sourceFiles",
    version: "1.0.0",
    tools: [saveToSources, listSourcesTool, extractTextTool, downloadToSources, ...(options.interactive ? [requestFile, retire] : [])],
  });
}
