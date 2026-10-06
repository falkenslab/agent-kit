import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Word, PowerPoint and Excel originals as markdown: the SDK's `Read` refuses DOCX and PPTX
 * (confirmed empirically), and course material is often both. The libraries are optional
 * peer dependencies of the kit (`mammoth` for DOCX, `fflate` to open PPTX and XLSX, which
 * are zips of XML); without them the caller is told what to install.
 */

export const EXTRACTABLE = new Set(["docx", "pptx", "xlsx"]);

/** The most rows of a sheet written out; the rest are counted. */
const MAX_SHEET_ROWS = 200;

export class MissingLibraryError extends Error {
  constructor(
    readonly library: string,
    options?: ErrorOptions,
  ) {
    super(`Reading this format needs the optional "${library}" library: npm install ${library}`, options);
  }
}

async function load<T>(library: string): Promise<T> {
  try {
    return (await import(library)) as T;
  } catch (error) {
    throw new MissingLibraryError(library, { cause: error });
  }
}

const decode = (xml: string): string =>
  xml
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");

/** The paragraphs of a DrawingML text body (slides and notes): each `<a:p>` its runs' `<a:t>` text. */
function paragraphs(xml: string): string[] {
  return [...xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)]
    .map((p) => [...p[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((t) => decode(t[1])).join(""))
    .map((text) => text.trim())
    .filter(Boolean);
}

type Unzipped = Record<string, Uint8Array>;
const text = (files: Unzipped, name: string): string | undefined => (files[name] ? new TextDecoder().decode(files[name]) : undefined);

async function unzip(file: string): Promise<Unzipped> {
  const { unzipSync } = await load<{ unzipSync(data: Uint8Array): Unzipped }>("fflate");
  return unzipSync(new Uint8Array(await readFile(file)));
}

/** A slide deck: a section per slide (its title, text and speaker notes), from slide `from` to `to` (1-based). */
async function pptx(file: string, from?: number, to?: number): Promise<string> {
  const files = await unzip(file);
  const slides = Object.keys(files)
    .map((name) => /^ppt\/slides\/slide(\d+)\.xml$/.exec(name))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  const first = Math.max(1, from ?? 1);
  const last = Math.min(slides.length, to ?? slides.length);
  const parts = [`# ${path.basename(file)}`, `${slides.length} slides${first > 1 || last < slides.length ? `; slides ${first} to ${last}` : ""}.`];
  let images = 0;
  for (const n of slides.slice(first - 1, last)) {
    const xml = text(files, `ppt/slides/slide${n}.xml`) ?? "";
    images += (xml.match(/<p:pic\b/g) ?? []).length;
    const [title, ...body] = paragraphs(xml);
    parts.push(`## Slide ${n}${title ? `: ${title}` : ""}`);
    if (body.length) parts.push(body.map((line) => `- ${line}`).join("\n"));
    // A slide's notes are linked from its relationships; their slide-number placeholder is left out.
    const rels = text(files, `ppt/slides/_rels/slide${n}.xml.rels`) ?? "";
    const notesTarget = /Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/.exec(rels)?.[1];
    const notes = notesTarget ? paragraphs(text(files, `ppt/notesSlides/${notesTarget}`) ?? "").filter((line) => !/^\d+$/.test(line)) : [];
    if (notes.length) parts.push(`Speaker notes:\n${notes.map((line) => `> ${line}`).join("\n")}`);
  }
  if (images) parts.push(`(${images} images left out.)`);
  return `${parts.join("\n\n")}\n`;
}

/** The column index of a cell reference ("C7" → 2). */
function columnOf(ref: string): number {
  let index = 0;
  for (const letter of /^[A-Z]+/.exec(ref)?.[0] ?? "A") index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

const cell = (value: string): string => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

/** A workbook: a markdown table per sheet, capped in rows. */
async function xlsx(file: string): Promise<string> {
  const files = await unzip(file);
  const shared = [...(text(files, "xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((si) =>
    [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decode(t[1])).join(""),
  );
  const workbook = text(files, "xl/workbook.xml") ?? "";
  const names = [...workbook.matchAll(/<sheet\b[^>]*name="([^"]*)"/g)].map((m) => decode(m[1]));
  const sheets = Object.keys(files)
    .map((name) => /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(name))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  const parts = [`# ${path.basename(file)}`];
  for (const n of sheets) {
    const xml = text(files, `xl/worksheets/sheet${n}.xml`) ?? "";
    const rows = [...xml.matchAll(/<row\b[\s\S]*?<\/row>/g)].map((row) => {
      const values: string[] = [];
      for (const c of row[0].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? "";
        const type = /t="(\w+)"/.exec(attrs)?.[1];
        const raw = /<v>([\s\S]*?)<\/v>/.exec(c[2] ?? "")?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[2] ?? "")?.[1] ?? "";
        const value = type === "s" ? (shared[Number(raw)] ?? "") : decode(raw);
        values[ref ? columnOf(ref) : values.length] = value;
      }
      return Array.from(values, (v) => cell(v ?? ""));
    });
    const filled = rows.filter((row) => row.some(Boolean));
    parts.push(`## ${names[n - 1] ?? `Sheet ${n}`}`);
    if (!filled.length) {
      parts.push("(empty)");
      continue;
    }
    const width = Math.max(...filled.map((row) => row.length));
    const pad = (row: string[]) => `| ${Array.from({ length: width }, (_, i) => row[i] ?? "").join(" | ")} |`;
    const shown = filled.slice(0, MAX_SHEET_ROWS);
    parts.push([pad(shown[0]), `|${" --- |".repeat(width)}`, ...shown.slice(1).map(pad)].join("\n"));
    if (filled.length > MAX_SHEET_ROWS) parts.push(`(${filled.length - MAX_SHEET_ROWS} more rows.)`);
  }
  return `${parts.join("\n\n")}\n`;
}

/** A Word document: headings, paragraphs, lists and tables. */
async function docx(file: string): Promise<string> {
  const mammoth = await load<{ convertToHtml(input: { path: string }): Promise<{ value: string }> }>("mammoth");
  const { value: html } = await mammoth.convertToHtml({ path: file });
  const images = (html.match(/<img\b/g) ?? []).length;
  // Markdown with turndown (also optional); plain text without it.
  const turndown = await load<{ default: new (options: object) => { turndown(html: string): string } }>("turndown").catch(() => null);
  const body = turndown
    ? new turndown.default({ headingStyle: "atx" }).turndown(html.replace(/<img\b[^>]*>/g, ""))
    : decode(html.replace(/<\/(p|h\d|li|tr)>/g, "\n").replace(/<[^>]+>/g, "")).trim();
  return `# ${path.basename(file)}\n\n${body}\n${images ? `\n(${images} images left out.)\n` : ""}`;
}

/** An original's text as markdown; `from`/`to` pick slides of a deck. */
export async function extractText(file: string, from?: number, to?: number): Promise<string> {
  const type = path.extname(file).slice(1).toLowerCase();
  if (type === "docx") return docx(file);
  if (type === "pptx") return pptx(file, from, to);
  if (type === "xlsx") return xlsx(file);
  throw new Error(`extract_text reads DOCX, PPTX and XLSX; for "${path.basename(file)}" use Read (PDFs, images, text).`);
}
