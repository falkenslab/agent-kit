import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The sources folder's bookkeeping: originals stay files (ADR-024), and the kit keeps a
 * manifest next to them (`.agent-kit/sources.json`, inside `sourcesDir`, where the agent's
 * file tools can't write) with each original's hash, size and provenance, the version it
 * replaces, and the hash it had when a summary page first pointed to it. From that it tells
 * new, ingested, changed and missing originals apart, refuses duplicates, and retires an
 * original into `.agent-kit/retired/` instead of deleting it.
 */

export const KIT_DIR = ".agent-kit";
const MANIFEST = "sources.json";
const RETIRED_DIR = "retired";

/** Where an original came from. */
export type SourceOrigin =
  | { kind: "run"; from: string }
  | { kind: "url"; from: string }
  | { kind: "person"; from: string }
  /** Copied in by hand: first seen by `listSources()`. */
  | { kind: "manual" };

export interface SourceEntry {
  hash: string;
  size: number;
  /** For hashing a file again only when it changed. */
  mtimeMs: number;
  addedAt: string;
  origin: SourceOrigin;
  /** The original this one is a new version of (a path relative to `sourcesDir`). */
  replaces?: string;
  /** The page this one was generated from (a web page's markdown, from its HTML). */
  derivedFrom?: string;
  /** The hash when a summary page first pointed to it: a different hash now means it changed after its ingest. */
  ingestedHash?: string;
}

export interface RetiredSource {
  path: string;
  movedTo: string;
  retiredAt: string;
  why: "wrong" | "replaced";
  reason: string;
  replacedBy?: string;
  entry?: SourceEntry;
}

export interface SourceManifest {
  version: 1;
  files: Record<string, SourceEntry>;
  retired: RetiredSource[];
}

export type SourceStatus = "new" | "ingested" | "changed" | "missing" | "present";

export interface SourceListing {
  path: string;
  status: SourceStatus;
  type: string;
  size?: number;
  pages?: number;
  slides?: number;
  origin?: SourceOrigin;
  replaces?: string;
  /** The summary pages that point to it (paths relative to the project). */
  summaries: string[];
}

const posix = (p: string): string => p.split(path.sep).join("/");

// The model can call several tools at once: everything that reads and writes a folder's
// manifest runs one at a time per folder, or a parallel call would lose another's entry.
const locks = new Map<string, Promise<unknown>>();
function serialized<T>(sourcesDir: string, work: () => Promise<T>): Promise<T> {
  const key = path.resolve(sourcesDir);
  const result = (locks.get(key) ?? Promise.resolve()).then(work, work);
  locks.set(key, result.catch(() => undefined));
  return result;
}
const now = (): string => new Date().toISOString();

export async function hashFile(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

/** Resolves `candidate` against `base`; the absolute path only if it stays inside it. */
export function resolveWithin(base: string, candidate: string): string | undefined {
  const resolved = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(base, candidate);
  const relative = path.relative(base, resolved);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)) ? resolved : undefined;
}

export async function loadManifest(sourcesDir: string): Promise<SourceManifest> {
  try {
    const parsed = JSON.parse(await readFile(path.join(sourcesDir, KIT_DIR, MANIFEST), "utf8")) as Partial<SourceManifest>;
    return { version: 1, files: parsed.files ?? {}, retired: parsed.retired ?? [] };
  } catch {
    return { version: 1, files: {}, retired: [] };
  }
}

export async function saveManifest(sourcesDir: string, manifest: SourceManifest): Promise<void> {
  await mkdir(path.join(sourcesDir, KIT_DIR), { recursive: true });
  await writeFile(path.join(sourcesDir, KIT_DIR, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Every original under `sourcesDir` (paths relative to it), leaving out hidden files and folders (the kit's own among them). */
export async function scanSources(sourcesDir: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) found.push(posix(path.relative(sourcesDir, full)));
    }
  }
  await walk(sourcesDir);
  return found.sort();
}

/** An entry for `file`, reusing the recorded hash when its size and modification time haven't changed. */
async function freshEntry(file: string, known: SourceEntry | undefined, origin: SourceOrigin): Promise<SourceEntry> {
  const info = await stat(file);
  if (known && known.size === info.size && known.mtimeMs === info.mtimeMs) return known;
  return { ...(known ?? { addedAt: now(), origin }), hash: await hashFile(file), size: info.size, mtimeMs: info.mtimeMs };
}

/** The original a frontmatter `file:` value points to (a relative path or a markdown link), resolved from the page's folder. */
function linkedFile(value: string, pageDir: string): string | undefined {
  const link = /\]\(([^)]+)\)/.exec(value)?.[1] ?? value.trim().replace(/^["']|["']$/g, "");
  if (!link || /^[a-z]+:\/\//i.test(link)) return undefined;
  return path.resolve(pageDir, decodeURI(link));
}

/** The summary pages (knowledge base layout: `summaries/*.md`) by the absolute path of the original their frontmatter `file:` points to. */
export async function summariesByOriginal(knowledgeDir: string): Promise<Map<string, string[]>> {
  const byOriginal = new Map<string, string[]>();
  const dir = path.join(knowledgeDir, "summaries");
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return byOriginal;
  }
  for (const name of names.filter((n) => n.endsWith(".md"))) {
    const page = path.join(dir, name);
    const text = await readFile(page, "utf8");
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
    const value = /^file:\s*(.+)$/m.exec(frontmatter)?.[1];
    const original = value ? linkedFile(value, dir) : undefined;
    if (original) byOriginal.set(path.normalize(original), [...(byOriginal.get(path.normalize(original)) ?? []), page]);
  }
  return byOriginal;
}

/** Pages of a PDF, read from its page tree without a parser; undefined when it can't tell (e.g. compressed object streams). */
export function pdfPageCount(bytes: Buffer): number | undefined {
  const text = bytes.toString("latin1");
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  const reversed = [...text.matchAll(/\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map((m) => Number(m[1]));
  const fromTree = Math.max(0, ...counts, ...reversed);
  if (fromTree > 0) return fromTree;
  const pages = text.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
  return pages > 0 ? pages : undefined;
}

/** Slides of a PPTX, from the file names in the zip (stored uncompressed). */
export function pptxSlideCount(bytes: Buffer): number | undefined {
  const names = new Set(bytes.toString("latin1").match(/ppt\/slides\/slide\d+\.xml/g) ?? []);
  return names.size > 0 ? names.size : undefined;
}

const typeOf = (file: string): string => path.extname(file).slice(1).toLowerCase() || "file";

/**
 * Every original with its status, recording in the manifest the ones copied in by hand and,
 * the first time a summary page points to one, its hash at ingest. Without a knowledge
 * folder there's no ingest to compare with: originals are "present".
 */
export function listSources(sourcesDir: string, knowledgeDir: string | undefined, projectDir: string): Promise<SourceListing[]> {
  return serialized(sourcesDir, () => listSourcesNow(sourcesDir, knowledgeDir, projectDir));
}

async function listSourcesNow(sourcesDir: string, knowledgeDir: string | undefined, projectDir: string): Promise<SourceListing[]> {
  const manifest = await loadManifest(sourcesDir);
  const summaries = knowledgeDir ? await summariesByOriginal(knowledgeDir) : new Map<string, string[]>();
  const files = await scanSources(sourcesDir);
  const listing: SourceListing[] = [];
  for (const rel of files) {
    const full = path.join(sourcesDir, rel);
    const entry = await freshEntry(full, manifest.files[rel], { kind: "manual" });
    const pagesOf = summaries.get(path.normalize(full)) ?? [];
    let status: SourceStatus = "present";
    if (knowledgeDir) {
      if (pagesOf.length === 0) status = "new";
      else {
        entry.ingestedHash ??= entry.hash;
        status = entry.ingestedHash === entry.hash ? "ingested" : "changed";
      }
    }
    manifest.files[rel] = entry;
    const type = typeOf(rel);
    const counts =
      type === "pdf" || type === "pptx"
        ? await readFile(full).then((bytes) => (type === "pdf" ? { pages: pdfPageCount(bytes) } : { slides: pptxSlideCount(bytes) }))
        : {};
    listing.push({
      path: rel,
      status,
      type,
      size: entry.size,
      ...counts,
      origin: entry.origin,
      ...(entry.replaces ? { replaces: entry.replaces } : {}),
      summaries: pagesOf.map((page) => posix(path.relative(projectDir, page))),
    });
  }
  for (const [rel, entry] of Object.entries(manifest.files)) {
    if (!files.includes(rel)) listing.push({ path: rel, status: "missing", type: typeOf(rel), origin: entry.origin, summaries: [] });
  }
  await saveManifest(sourcesDir, manifest);
  return listing;
}

export interface AddedSource {
  /** Where it is, relative to `sourcesDir`. */
  path: string;
  /** An identical file was already there: nothing was copied. */
  duplicateOf?: string;
}

/**
 * Adds `file` (an absolute path) to `sourcesDir` at `destination`: never overwriting, and
 * not at all if an identical file is already there (its path is returned). `replaces`
 * records it as a new version of an original already in the folder.
 */
export function addSource(
  sourcesDir: string,
  file: string,
  destination: string,
  origin: SourceOrigin,
  extra: { replaces?: string; derivedFrom?: string } = {},
): Promise<AddedSource> {
  return serialized(sourcesDir, () => addSourceNow(sourcesDir, file, destination, origin, extra));
}

async function addSourceNow(
  sourcesDir: string,
  file: string,
  destination: string,
  origin: SourceOrigin,
  extra: { replaces?: string; derivedFrom?: string },
): Promise<AddedSource> {
  const target = resolveWithin(sourcesDir, destination);
  if (!target || posix(path.relative(sourcesDir, target)).split("/").some((part) => part.startsWith("."))) {
    throw new Error(`"${destination}" isn't a path inside sources/ (hidden folders are the kit's).`);
  }
  const manifest = await loadManifest(sourcesDir);
  if (extra.replaces) {
    const old = resolveWithin(sourcesDir, extra.replaces);
    if (!old || !(await stat(old).catch(() => null))) throw new Error(`"${extra.replaces}" isn't an original in sources/, so it can't be replaced.`);
  }
  const hash = await hashFile(file);
  for (const rel of await scanSources(sourcesDir)) {
    const entry = await freshEntry(path.join(sourcesDir, rel), manifest.files[rel], { kind: "manual" });
    manifest.files[rel] = entry;
    if (entry.hash === hash) {
      await saveManifest(sourcesDir, manifest);
      return { path: rel, duplicateOf: rel };
    }
  }
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await copyFile(file, target, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`"${destination}" already exists in sources/: originals are never overwritten. Pick another name${extra.replaces ? "" : ", or pass `replaces` for a new version"}.`, {
        cause: error,
      });
    }
    throw error;
  }
  const rel = posix(path.relative(sourcesDir, target));
  const info = await stat(target);
  manifest.files[rel] = {
    hash,
    size: info.size,
    mtimeMs: info.mtimeMs,
    addedAt: now(),
    origin,
    ...(extra.replaces ? { replaces: posix(path.relative(sourcesDir, resolveWithin(sourcesDir, extra.replaces)!)) } : {}),
    ...(extra.derivedFrom ? { derivedFrom: extra.derivedFrom } : {}),
  };
  await saveManifest(sourcesDir, manifest);
  return { path: rel };
}

/** What retiring an original did to its summary pages (paths relative to the project). */
export interface RetireResult {
  movedTo: string;
  summaries: { page: string; marked: "retired" | "superseded"; supersededBy?: string }[];
}

/** Adds frontmatter fields and a notice under the frontmatter of a markdown page. */
async function markPage(page: string, fields: Record<string, string>, notice: string): Promise<void> {
  const text = await readFile(page, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  const updated = match
    ? `---\n${match[1].split(/\r?\n/).filter((line) => !Object.keys(fields).some((key) => line.startsWith(`${key}:`))).concat(lines).join("\n")}\n---\n\n> ${notice}\n\n${text.slice(match[0].length).replace(/^\s+/, "")}`
    : `---\n${lines.join("\n")}\n---\n\n> ${notice}\n\n${text}`;
  await writeFile(page, updated);
}

/**
 * Moves an original to `.agent-kit/retired/` (never deleted: the person empties that folder)
 * and records why. Its summary pages are marked: retired if the original was wrong (what it
 * taught was wrong), superseded if it was replaced, pointing to the replacement's summary
 * when there is one.
 */
export function retireSource(
  sourcesDir: string,
  knowledgeDir: string | undefined,
  projectDir: string,
  source: string,
  why: "wrong" | "replaced",
  reason: string,
  replacedBy?: string,
): Promise<RetireResult> {
  return serialized(sourcesDir, () => retireSourceNow(sourcesDir, knowledgeDir, projectDir, source, why, reason, replacedBy));
}

async function retireSourceNow(
  sourcesDir: string,
  knowledgeDir: string | undefined,
  projectDir: string,
  source: string,
  why: "wrong" | "replaced",
  reason: string,
  replacedBy?: string,
): Promise<RetireResult> {
  const full = resolveWithin(sourcesDir, source);
  if (!full || !(await stat(full).catch(() => null))?.isFile()) throw new Error(`"${source}" isn't an original in sources/.`);
  const rel = posix(path.relative(sourcesDir, full));
  if (rel.split("/").some((part) => part.startsWith("."))) throw new Error(`"${source}" is one of the kit's own files.`);
  const replacement = replacedBy ? resolveWithin(sourcesDir, replacedBy) : undefined;
  if (replacedBy && (!replacement || !(await stat(replacement).catch(() => null)))) throw new Error(`"${replacedBy}" isn't an original in sources/.`);

  const summaries = knowledgeDir ? await summariesByOriginal(knowledgeDir) : new Map<string, string[]>();
  const manifest = await loadManifest(sourcesDir);
  const stamp = now();
  const movedTo = posix(path.join(KIT_DIR, RETIRED_DIR, `${stamp.replace(/[:.]/g, "-")}-${path.basename(rel)}`));
  await mkdir(path.join(sourcesDir, KIT_DIR, RETIRED_DIR), { recursive: true });
  await rename(full, path.join(sourcesDir, movedTo));
  manifest.retired.push({
    path: rel,
    movedTo,
    retiredAt: stamp,
    why,
    reason,
    ...(replacement ? { replacedBy: posix(path.relative(sourcesDir, replacement)) } : {}),
    ...(manifest.files[rel] ? { entry: manifest.files[rel] } : {}),
  });
  delete manifest.files[rel];
  await saveManifest(sourcesDir, manifest);

  const date = stamp.slice(0, 10);
  const replacementSummary = replacement ? summaries.get(path.normalize(replacement))?.[0] : undefined;
  const result: RetireResult = { movedTo, summaries: [] };
  for (const page of summaries.get(path.normalize(full)) ?? []) {
    if (why === "wrong") {
      await markPage(page, { status: "retired", retired: date }, `Retired on ${date}: its original was wrong (${reason}). Don't rely on what it says.`);
      result.summaries.push({ page: posix(path.relative(projectDir, page)), marked: "retired" });
    } else {
      const link = replacementSummary ? posix(path.relative(path.dirname(page), replacementSummary)) : undefined;
      await markPage(
        page,
        { status: "superseded", superseded: date, ...(link ? { superseded_by: link } : {}) },
        `Superseded on ${date}: its original was replaced (${reason})${link ? `; see [the new summary](${link})` : ""}.`,
      );
      result.summaries.push({ page: posix(path.relative(projectDir, page)), marked: "superseded", ...(replacementSummary ? { supersededBy: posix(path.relative(projectDir, replacementSummary)) } : {}) });
    }
  }
  return result;
}
